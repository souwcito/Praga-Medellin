<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use App\Models\DetalleVenta;
use App\Models\Variante;
use App\Models\Producto;
use App\Models\Empleado;
use App\Models\Sede;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private function inicioPeriodo(string $periodo): \Carbon\Carbon
    {
        $d = now()->startOfDay();
        $dias = $periodo === 'dia' ? 0 : ($periodo === 'semana' ? 6 : 29);
        return $d->subDays($dias);
    }

    public function resumen(Request $request)
    {
        $periodo = $request->periodo ?? 'mes';
        $inicio = $this->inicioPeriodo($periodo);

        $ventas = Venta::where('created_at', '>=', $inicio)->get();

        $total = (int) $ventas->sum('total');
        $numVentas = $ventas->count();
        $ticketPromedio = $numVentas ? (int) round($total / $numVentas) : 0;

        $totalPorSede = Sede::orderBy('id')->get()->map(function ($s) use ($ventas) {
            return [
                'sede_id' => $s->id,
                'sede' => $s->nombre,
                'total' => (int) $ventas->where('sede_venta_id', $s->id)->sum('total'),
            ];
        });

        $ids = $ventas->pluck('id');
        $detalles = DetalleVenta::whereIn('venta_id', $ids)->get();

        // Carga única de variantes/productos/empleados/sedes (evita N+1)
        $variantes = Variante::pluck('producto_id', 'id');
        $productos = Producto::pluck('nombre', 'id');
        $empleados = Empleado::pluck('nombre', 'id');
        $sedesMap = Sede::pluck('nombre', 'id');

        $conteo = [];
        foreach ($detalles as $d) {
            $productoId = $variantes[$d->variante_id] ?? $d->variante_id;
            $conteo[$productoId] = ($conteo[$productoId] ?? 0) + $d->cantidad;
        }
        arsort($conteo);
        $productosMasVendidos = [];
        foreach (array_slice($conteo, 0, 5, true) as $productoId => $cantidad) {
            $productosMasVendidos[] = [
                'producto' => $productos[$productoId] ?? ('Producto ' . $productoId),
                'cantidad' => (int) $cantidad,
            ];
        }

        $porEmpleado = [];
        foreach ($ventas as $v) {
            if (!isset($porEmpleado[$v->empleado_id])) {
                $porEmpleado[$v->empleado_id] = ['total' => 0, 'numVentas' => 0];
            }
            $porEmpleado[$v->empleado_id]['total'] += $v->total;
            $porEmpleado[$v->empleado_id]['numVentas']++;
        }
        $empleadoDestacado = null;
        if ($porEmpleado) {
            uasort($porEmpleado, fn ($a, $b) => $b['total'] <=> $a['total']);
            $top = array_key_first($porEmpleado);
            $empleadoDestacado = [
                'nombre' => $empleados[$top] ?? ('Empleado ' . $top),
                'sede' => $empleados->has($top) && ($e = Empleado::find($top)) ? ($sedesMap[$e->sede_id] ?? null) : null,
                'total' => (int) $porEmpleado[$top]['total'],
                'numVentas' => (int) $porEmpleado[$top]['numVentas'],
            ];
        }

        $numDias = $periodo === 'dia' ? 1 : ($periodo === 'semana' ? 7 : 15);
        $ventasPorDia = [];
        for ($i = $numDias - 1; $i >= 0; $i--) {
            $dia = now()->startOfDay()->subDays($i);
            $diaTotal = (int) $ventas->filter(fn ($v) => $v->created_at->toDateString() === $dia->toDateString())->sum('total');
            $ventasPorDia[] = [
                'fecha' => $dia->translatedFormat('d M'),
                'total' => $diaTotal,
            ];
        }

        return response()->json([
            'periodo' => $periodo,
            'total' => $total,
            'numVentas' => $numVentas,
            'ticketPromedio' => $ticketPromedio,
            'totalPorSede' => $totalPorSede,
            'productosMasVendidos' => $productosMasVendidos,
            'empleadoDestacado' => $empleadoDestacado,
            'ventasPorDia' => $ventasPorDia,
        ]);
    }
}