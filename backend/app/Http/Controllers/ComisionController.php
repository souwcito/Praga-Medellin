<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use App\Models\Empleado;
use App\Models\Sede;
use Illuminate\Http\Request;

class ComisionController extends Controller
{
    private function inicioPeriodo(string $periodo): \Carbon\Carbon
    {
        $d = now()->startOfDay();
        $dias = $periodo === 'dia' ? 0 : ($periodo === 'semana' ? 6 : 29);
        return $d->subDays($dias);
    }

    // Ventas por vendedor (informativo, sin cálculo de comisión)
    public function index(Request $request)
    {
        $query = Venta::with('factura');
        if ($request->filled('periodo')) {
            $query->where('created_at', '>=', $this->inicioPeriodo($request->periodo));
        }
        $ventas = $query->get();

        $porEmpleado = [];
        foreach ($ventas as $v) {
            if (!isset($porEmpleado[$v->empleado_id])) {
                $porEmpleado[$v->empleado_id] = ['total' => 0, 'numVentas' => 0, 'ventas' => []];
            }
            $porEmpleado[$v->empleado_id]['total'] += $v->total;
            $porEmpleado[$v->empleado_id]['numVentas']++;
            $porEmpleado[$v->empleado_id]['ventas'][] = [
                'venta_id' => $v->id,
                'fecha' => $v->created_at->toISOString(),
                'sede_venta_id' => $v->sede_venta_id,
                'tipo' => $v->tipo,
                'total' => (int) $v->total,
                'factura' => optional($v->factura)->numero_interno,
            ];
        }

        $lista = [];
        foreach ($porEmpleado as $empleadoId => $stats) {
            $e = Empleado::find($empleadoId);
            $sede = $e ? Sede::find($e->sede_id) : null;
            if ($request->filled('sede_id') && $e && $e->sede_id != $request->sede_id) {
                continue;
            }
            $lista[] = [
                'empleado_id' => (int) $empleadoId,
                'nombre' => $e ? $e->nombre : 'Empleado ' . $empleadoId,
                'sede_id' => $e ? $e->sede_id : null,
                'sede' => $sede ? $sede->nombre : null,
                'total' => (int) $stats['total'],
                'numVentas' => (int) $stats['numVentas'],
                'ventas' => $stats['ventas'],
            ];
        }

        usort($lista, fn ($a, $b) => $b['total'] <=> $a['total']);
        return response()->json($lista);
    }
}