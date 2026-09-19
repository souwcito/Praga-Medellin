<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use App\Models\DetalleVenta;
use App\Models\Inventario;
use App\Models\Factura;
use App\Models\Variante;
use App\Models\Producto;
use App\Models\Empleado;
use App\Models\Sede;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VentaController extends Controller
{
    // Registrar una venta (POS) por VARIANTE
    public function store(Request $request)
    {
        $request->validate([
            'empleado_id' => 'required|integer',
            'sede_venta_id' => 'required|integer',
            'items' => 'required|array',
            'items.*.variante_id' => 'required|integer',
            'items.*.cantidad' => 'required|integer|min:1',
            'items.*.precio_unitario' => 'required|integer',
        ]);

        try {
            DB::beginTransaction();

            $ultimaVenta = Venta::orderBy('id', 'desc')->first();
            $siguiente = $ultimaVenta ? (int) str_replace('FAC-', '', $ultimaVenta->numero_interno) + 1 : 1001;
            $numeroInterno = 'FAC-' . $siguiente;

            $total = 0;
            foreach ($request->items as $item) {
                $total += $item['cantidad'] * $item['precio_unitario'];
            }

            $venta = Venta::create([
                'empleado_id' => $request->empleado_id,
                'sede_venta_id' => $request->sede_venta_id,
                'tipo' => $request->tipo ?? 'presencial',
                'numero_interno' => $numeroInterno,
                'total' => $total,
            ]);

            $itemsSalida = [];
            foreach ($request->items as $item) {
                $subtotal = $item['cantidad'] * $item['precio_unitario'];

                DetalleVenta::create([
                    'venta_id' => $venta->id,
                    'variante_id' => $item['variante_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $item['precio_unitario'],
                    'subtotal' => $subtotal,
                ]);

                $inv = Inventario::where('sede_id', $venta->sede_venta_id)
                    ->where('variante_id', $item['variante_id'])
                    ->first();
                if (!$inv) {
                    throw new \Exception('La variante no tiene inventario en esta sede.');
                }
                if ($inv->stock < $item['cantidad']) {
                    throw new \Exception('Stock insuficiente para la variante solicitada.');
                }
                $inv->stock -= $item['cantidad'];
                $inv->save();

                $variante = Variante::with('producto')->find($item['variante_id']);
                $itemsSalida[] = [
                    'variante_id' => (int) $item['variante_id'],
                    'nombre' => $variante->producto->nombre,
                    'talla' => $variante->talla,
                    'cantidad' => (int) $item['cantidad'],
                    'precio_unitario' => (int) $item['precio_unitario'],
                    'subtotal' => (int) $subtotal,
                ];
            }

            $factura = Factura::create([
                'venta_id' => $venta->id,
                'numero_interno' => $numeroInterno,
            ]);

            DB::commit();

            $sede = Sede::find($venta->sede_venta_id);
            $vendedor = Empleado::find($venta->empleado_id);

            return response()->json([
                'venta' => [
                    'id' => $venta->id,
                    'empleado_id' => $venta->empleado_id,
                    'sede_venta_id' => $venta->sede_venta_id,
                    'tipo' => $venta->tipo,
                    'fecha' => $venta->created_at->toISOString(),
                    'total' => (int) $venta->total,
                ],
                'factura' => ['venta_id' => $venta->id, 'numero_interno' => $numeroInterno, 'fecha' => $venta->created_at->toISOString()],
                'items' => $itemsSalida,
                'sede' => $sede ? $sede->nombre : null,
                'vendedor' => $vendedor ? $vendedor->nombre : null,
                'total' => (int) $venta->total,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al procesar la venta: ' . $e->getMessage()], 400);
        }
    }

    // Busca una venta por su número de factura con sus artículos (para precargar
    // una devolución en el punto físico).
    public function buscarPorFactura(Request $request)
    {
        $numero = $request->query('factura');
        if (!$numero) {
            return response()->json(['error' => 'El parámetro factura es requerido'], 400);
        }

        $venta = Venta::with(['empleado', 'sedeVenta', 'detalles.variante.producto'])
            ->where('numero_interno', $numero)
            ->first();

        if (!$venta) {
            return response()->json(['error' => 'No se encontró ninguna venta con esa factura'], 404);
        }

        $items = $venta->detalles->map(function ($det) {
            $variante = $det->variante;
            $producto = $variante ? $variante->producto : null;
            return [
                'variante_id' => $det->variante_id,
                'nombre' => $producto ? $producto->nombre : 'Producto ' . $det->variante_id,
                'talla' => $variante ? $variante->talla : null,
                'cantidad' => (int) $det->cantidad,
                'precio_unitario' => (int) $det->precio_unitario,
                'subtotal' => (int) $det->subtotal,
            ];
        });

        return response()->json([
            'venta' => [
                'id' => $venta->id,
                'factura' => $venta->numero_interno,
                'fecha' => $venta->created_at->toISOString(),
                'sede_venta' => optional($venta->sedeVenta)->nombre ?? '—',
                'empleado' => optional($venta->empleado)->nombre ?? '—',
                'total' => (int) $venta->total,
            ],
            'items' => $items->values(),
        ]);
    }

    private function inicioPeriodo(string $periodo): \Carbon\Carbon
    {
        $d = now()->startOfDay();
        $dias = $periodo === 'dia' ? 0 : ($periodo === 'semana' ? 6 : 29);
        return $d->subDays($dias);
    }

    // Historial de ventas con paginación (estilo Laravel)
    public function index(Request $request)
    {
        $query = Venta::with(['empleado', 'sedeVenta', 'factura'])->orderByDesc('id');

        if ($request->filled('periodo')) {
            $query->where('created_at', '>=', $this->inicioPeriodo($request->periodo));
        }
        if ($request->filled('sede_id')) {
            $query->where('sede_venta_id', $request->sede_id);
        }
        if ($request->filled('empleado_id')) {
            $query->where('empleado_id', $request->empleado_id);
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        $perPage = (int) ($request->per_page ?? 10);
        $paginated = $query->paginate($perPage);

        $totalVendido = (clone $query)->sum('total');

        $data = $paginated->map(function ($v) {
            return [
                'id' => $v->id,
                'factura' => optional($v->factura)->numero_interno,
                'fecha' => $v->created_at->toISOString(),
                'empleado' => ['id' => $v->empleado_id, 'nombre' => optional($v->empleado)->nombre ?? '—'],
                'sede_venta' => optional($v->sedeVenta)->nombre ?? '—',
                'tipo' => $v->tipo,
                'total' => (int) $v->total,
            ];
        });

        return response()->json([
            'data' => $data->values(),
            'meta' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ],
            'resumen' => ['totalVendido' => (int) $totalVendido],
        ]);
    }
}