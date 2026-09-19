<?php

namespace App\Http\Controllers;

use App\Models\Devolucion;
use App\Models\DetalleDevolucion;
use App\Models\DetalleVenta;
use App\Models\Inventario;
use App\Models\Sede;
use App\Models\Empleado;
use App\Models\Variante;
use App\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DevolucionController extends Controller
{
    // Registrar un CAMBIO o un REEMBOLSO interno en el punto físico.
    // - cambio: el cliente devuelve productos (vuelven al inventario) y se lleva
    //   otros de igual o mayor valor (salen del inventario). Si es mayor, paga la diferencia.
    // - reembolso: caso extremo interno; el cliente devuelve productos (vuelven al
    //   inventario) y la tienda entrega dinero en efectivo de vuelta (descuenta de ingresos).
    public function store(Request $request)
    {
        $request->validate([
            'venta_id' => 'required|integer',
            'sede_id' => 'required|integer',
            'empleado_id' => 'required|integer',
            'tipo' => 'nullable|string|in:cambio,reembolso',
            'devueltos' => 'required|array|min:1',
            'devueltos.*.variante_id' => 'required|integer',
            'devueltos.*.cantidad' => 'required|integer|min:1',
            'devueltos.*.precio_unitario' => 'required|integer|min:0',
            'cambios' => 'sometimes|array',
            'cambios.*.variante_id' => 'required|integer',
            'cambios.*.cantidad' => 'required|integer|min:1',
            'cambios.*.precio_unitario' => 'required|integer|min:0',
            'metodo_pago' => 'nullable|string',
            'motivo' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $tipo = $request->tipo ?? 'cambio';

            $venta = Venta::find($request->venta_id);
            if (!$venta) {
                throw new \Exception('La venta de origen no existe.');
            }

            $totalDevuelto = 0;
            $devueltosDetalle = [];
            foreach ($request->devueltos as $item) {
                $cantidad = (int) $item['cantidad'];
                $vendido = (int) DetalleVenta::where('venta_id', $venta->id)
                    ->where('variante_id', $item['variante_id'])
                    ->sum('cantidad');
                if ($cantidad > $vendido) {
                    throw new \Exception('La cantidad devuelta supera lo vendido en la factura.');
                }
                $totalDevuelto += $cantidad * (int) $item['precio_unitario'];
                $devueltosDetalle[] = [
                    'variante_id' => (int) $item['variante_id'],
                    'cantidad' => $cantidad,
                    'precio_unitario' => (int) $item['precio_unitario'],
                ];
            }

            $totalCambio = 0;
            $cambiosDetalle = [];
            foreach (($request->cambios ?? []) as $item) {
                $cantidad = (int) $item['cantidad'];
                $inv = Inventario::where('sede_id', $request->sede_id)
                    ->where('variante_id', $item['variante_id'])
                    ->first();
                if (!$inv || $inv->stock < $cantidad) {
                    throw new \Exception('Stock insuficiente para el producto de cambio.');
                }
                $totalCambio += $cantidad * (int) $item['precio_unitario'];
                $cambiosDetalle[] = [
                    'variante_id' => (int) $item['variante_id'],
                    'cantidad' => $cantidad,
                    'precio_unitario' => (int) $item['precio_unitario'],
                ];
            }

            $diferencia = $totalCambio - $totalDevuelto;

            if ($tipo === 'reembolso') {
                if (count($cambiosDetalle) > 0) {
                    throw new \Exception('Un reembolso no puede incluir productos de cambio.');
                }
                if (!$request->metodo_pago) {
                    throw new \Exception('Indica el método por el que se entrega el dinero al cliente.');
                }
            } else {
                if (count($cambiosDetalle) === 0) {
                    throw new \Exception('Debes agregar al menos un producto de cambio.');
                }
                if ($diferencia < 0) {
                    throw new \Exception('El cambio debe ser de igual o mayor valor que lo devuelto.');
                }
                if ($diferencia > 0 && !$request->metodo_pago) {
                    throw new \Exception('El método de pago es obligatorio cuando el cambio supera el valor devuelto.');
                }
            }

            $ultima = Devolucion::orderBy('id', 'desc')->first();
            $siguiente = $ultima ? (int) str_replace('DEV-', '', $ultima->numero_interno) + 1 : 1001;
            $numeroInterno = 'DEV-' . $siguiente;

            $devolucion = Devolucion::create([
                'venta_id' => $venta->id,
                'sede_id' => $request->sede_id,
                'empleado_id' => $request->empleado_id,
                'numero_interno' => $numeroInterno,
                'tipo' => $tipo,
                'total_devuelto' => $totalDevuelto,
                'total_cambio' => $totalCambio,
                'diferencia' => $diferencia,
                'metodo_pago' => $tipo === 'reembolso' ? $request->metodo_pago : ($diferencia > 0 ? $request->metodo_pago : null),
                'motivo' => $request->motivo ?? null,
            ]);

            // Artículos devueltos: vuelven al inventario (entrada)
            foreach ($devueltosDetalle as $item) {
                DetalleDevolucion::create([
                    'devolucion_id' => $devolucion->id,
                    'variante_id' => $item['variante_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $item['precio_unitario'],
                    'tipo' => 'devuelto',
                ]);

                $reg = Inventario::where('sede_id', $request->sede_id)
                    ->where('variante_id', $item['variante_id'])
                    ->first();
                if (!$reg) {
                    $reg = Inventario::create([
                        'variante_id' => $item['variante_id'],
                        'sede_id' => $request->sede_id,
                        'stock' => 0,
                    ]);
                }
                $reg->stock += $item['cantidad'];
                $reg->save();
            }

            // Artículos de cambio: salen del inventario (salida)
            foreach ($cambiosDetalle as $item) {
                DetalleDevolucion::create([
                    'devolucion_id' => $devolucion->id,
                    'variante_id' => $item['variante_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $item['precio_unitario'],
                    'tipo' => 'cambio',
                ]);

                $reg = Inventario::where('sede_id', $request->sede_id)
                    ->where('variante_id', $item['variante_id'])
                    ->first();
                $reg->stock -= $item['cantidad'];
                $reg->save();
            }

            DB::commit();

            return response()->json($this->formatear($devolucion, $venta), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al registrar la devolución: ' . $e->getMessage()], 400);
        }
    }

    // Historial de devoluciones con paginación y filtros (estilo ventas)
    public function index(Request $request)
    {
        $query = Devolucion::with(['empleado', 'sede', 'venta'])->orderByDesc('id');

        if ($request->filled('periodo')) {
            $query->where('created_at', '>=', $this->inicioPeriodo($request->periodo));
        }
        if ($request->filled('sede_id')) {
            $query->where('sede_id', $request->sede_id);
        }
        if ($request->filled('empleado_id')) {
            $query->where('empleado_id', $request->empleado_id);
        }
        if ($request->filled('venta_id')) {
            $query->where('venta_id', $request->venta_id);
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        $perPage = (int) ($request->per_page ?? 10);
        $paginated = $query->paginate($perPage);

        $resumen = [
            'totalDevuelto' => (int) (clone $query)->sum('total_devuelto'),
            'totalCambio' => (int) (clone $query)->sum('total_cambio'),
            // Dinero entregado al cliente en reembolsos internos (descuenta de ingresos)
            'totalReembolsado' => (int) (clone $query)->where('tipo', 'reembolso')->sum('total_devuelto'),
            'numDevoluciones' => (int) (clone $query)->count(),
        ];

        $data = $paginated->map(function ($d) {
            return $this->formatear($d);
        });

        return response()->json([
            'data' => $data->values(),
            'meta' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ],
            'resumen' => $resumen,
        ]);
    }

    // Detalle de una devolución con sus artículos
    public function show($id)
    {
        $devolucion = Devolucion::with(['empleado', 'sede', 'venta', 'detalles.variante.producto'])
            ->find($id);

        if (!$devolucion) {
            return response()->json(['error' => 'Devolución no encontrada'], 404);
        }

        return response()->json($this->formatear($devolucion, true));
    }

    private function inicioPeriodo(string $periodo): \Carbon\Carbon
    {
        $d = now()->startOfDay();
        $dias = $periodo === 'dia' ? 0 : ($periodo === 'semana' ? 6 : 29);
        return $d->subDays($dias);
    }

    private function formatear(Devolucion $d, bool $conDetalle = false): array
    {
        $detalles = $d->detalles->map(function ($det) {
            $variante = $det->variante;
            $producto = $variante ? $variante->producto : null;
            return [
                'id' => $det->id,
                'variante_id' => $det->variante_id,
                'nombre' => $producto ? $producto->nombre : 'Producto ' . $det->variante_id,
                'talla' => $variante ? $variante->talla : null,
                'cantidad' => (int) $det->cantidad,
                'precio_unitario' => (int) $det->precio_unitario,
                'subtotal' => (int) ($det->cantidad * $det->precio_unitario),
                'tipo' => $det->tipo,
            ];
        });

        $data = [
            'id' => $d->id,
            'numero_interno' => $d->numero_interno,
            'tipo' => $d->tipo ?? 'cambio',
            'factura' => optional($d->venta)->numero_interno,
            'venta_id' => $d->venta_id,
            'fecha' => $d->created_at->toISOString(),
            'empleado' => ['id' => $d->empleado_id, 'nombre' => optional($d->empleado)->nombre ?? '—'],
            'sede' => optional($d->sede)->nombre ?? '—',
            'total_devuelto' => (int) $d->total_devuelto,
            'total_cambio' => (int) $d->total_cambio,
            'diferencia' => (int) $d->diferencia,
            'reembolsado' => ($d->tipo ?? 'cambio') === 'reembolso' ? (int) $d->total_devuelto : null,
            'metodo_pago' => $d->metodo_pago,
            'motivo' => $d->motivo,
            'estado' => $d->estado,
        ];

        if ($conDetalle) {
            $data['items'] = $detalles->values();
        }

        return $data;
    }
}