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
use App\Models\Pedido;
use App\Services\ConsecutivoService;
use App\Services\FechaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

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
            'sede_cambio_id' => 'nullable|integer|exists:sedes,id',
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

            // Sede de la que salen los productos del cambio: si no se indica, es
            // la misma sede donde se recibe la devolución.
            $sedeCambioId = (int) ($request->sede_cambio_id ?? $request->sede_id);

            $venta = Venta::with('sedeVenta')->find($request->venta_id);
            if (!$venta) {
                throw new \Exception('La venta de origen no existe.');
            }

            $totalDevuelto = 0;
            $devueltosDetalle = [];
            foreach ($request->devueltos as $item) {
                $cantidad = (int) $item['cantidad'];
                $varianteId = (int) $item['variante_id'];

                $vendido = (int) DetalleVenta::where('venta_id', $venta->id)
                    ->where('variante_id', $varianteId)
                    ->sum('cantidad');

                // No permitir devolver más de lo que queda pendiente (descontando
                // devoluciones anteriores de la misma factura).
                $yaDevuelto = (int) DetalleDevolucion::where('variante_id', $varianteId)
                    ->where('tipo', 'devuelto')
                    ->whereHas('devolucion', fn ($q) => $q->where('venta_id', $venta->id))
                    ->sum('cantidad');

                if ($cantidad > $vendido - $yaDevuelto) {
                    throw new \Exception('La cantidad devuelta supera lo vendido en la factura.');
                }

                $totalDevuelto += $cantidad * (int) $item['precio_unitario'];
                $devueltosDetalle[] = [
                    'variante_id' => $varianteId,
                    'cantidad' => $cantidad,
                    'precio_unitario' => (int) $item['precio_unitario'],
                    'origenes' => $this->origenesDevolucion($venta, $varianteId),
                ];
            }

            $totalCambio = 0;
            $cambiosDetalle = [];
            foreach (($request->cambios ?? []) as $item) {
                $cantidad = (int) $item['cantidad'];
                $inv = Inventario::where('sede_id', $sedeCambioId)
                    ->where('variante_id', $item['variante_id'])
                    ->first();
                if (!$inv || $inv->stock < $cantidad) {
                    throw new \Exception('Stock insuficiente para el producto de cambio en la sede seleccionada.');
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

            $numeroInterno = 'DEV-' . ConsecutivoService::siguiente('devolucion');

            $devolucion = Devolucion::create([
                'venta_id' => $venta->id,
                'sede_id' => $request->sede_id,
                'sede_cambio_id' => $tipo === 'cambio' ? $sedeCambioId : null,
                'empleado_id' => $request->empleado_id,
                'numero_interno' => $numeroInterno,
                'tipo' => $tipo,
                'total_devuelto' => $totalDevuelto,
                'total_cambio' => $totalCambio,
                'diferencia' => $diferencia,
                'metodo_pago' => $tipo === 'reembolso' ? $request->metodo_pago : ($diferencia > 0 ? $request->metodo_pago : null),
                'motivo' => $request->motivo ?? null,
            ]);

            // Artículos devueltos: vuelven al inventario (entrada). En ventas
            // online se devuelven a la sede de origen; la sede "Online" nunca
            // recibe stock.
            $sedeOnlineId = (int) (Sede::where('nombre', 'Online')->value('id') ?? 0);
            $sedeRecibidaId = (int) $request->sede_id;
            $sedesAfectadas = [];

            foreach ($devueltosDetalle as $item) {
                DetalleDevolucion::create([
                    'devolucion_id' => $devolucion->id,
                    'variante_id' => $item['variante_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $item['precio_unitario'],
                    'tipo' => 'devuelto',
                ]);

                $restante = (int) $item['cantidad'];

                foreach (($item['origenes'] ?? []) as $origen) {
                    if ($restante <= 0) {
                        break;
                    }

                    $sedeOrigenId = (int) ($origen['sede_id'] ?? 0);
                    if (!$sedeOrigenId || $sedeOrigenId === $sedeOnlineId) {
                        continue;
                    }

                    $cantidadOrigen = min($restante, (int) $origen['cantidad']);
                    if ($cantidadOrigen <= 0) {
                        continue;
                    }

                    $reg = Inventario::firstOrCreate(
                        ['sede_id' => $sedeOrigenId, 'variante_id' => $item['variante_id']],
                        ['stock' => 0],
                    );
                    $reg->stock = (int) $reg->stock + $cantidadOrigen;
                    $reg->save();

                    $sedesAfectadas[] = $sedeOrigenId;
                    $restante -= $cantidadOrigen;
                }

                // Si la venta antigua no tenía origen o faltaba información, se
                // usa la sede física seleccionada para recibir la devolución.
                if ($restante > 0 && $sedeRecibidaId && $sedeRecibidaId !== $sedeOnlineId) {
                    $reg = Inventario::firstOrCreate(
                        ['sede_id' => $sedeRecibidaId, 'variante_id' => $item['variante_id']],
                        ['stock' => 0],
                    );
                    $reg->stock = (int) $reg->stock + $restante;
                    $reg->save();
                    $sedesAfectadas[] = $sedeRecibidaId;
                }
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

                $reg = Inventario::where('sede_id', $sedeCambioId)
                    ->where('variante_id', $item['variante_id'])
                    ->first();
                $reg->stock -= $item['cantidad'];
                $reg->save();
            }

            // Invalida la caché del stock de todas las sedes afectadas: las de
            // origen de los productos devueltos, la sede que recibe y la de cambio.
            $sedesCache = array_unique(array_filter(array_merge(
                $sedesAfectadas,
                [(int) $request->sede_id, $sedeCambioId],
            )));
            foreach ($sedesCache as $sedeId) {
                Cache::forget(InventarioController::claveSede((int) $sedeId));
            }

            DB::commit();

            // La caché pública del catálogo se refresca sola (60 s).

            return response()->json($this->formatear($devolucion, true), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al registrar la devolución: ' . $e->getMessage()], 400);
        }
    }

    // Historial de devoluciones con paginación y filtros (estilo ventas)
    public function index(Request $request)
    {
        $query = Devolucion::with(['empleado', 'sede', 'sedeCambio', 'venta', 'detalles.variante.producto'])->orderByDesc('id');

        if ($request->filled('periodo')) {
            $query->where('created_at', '>=', FechaService::inicioPeriodo($request->periodo));
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
        $devolucion = Devolucion::with(['empleado', 'sede', 'sedeCambio', 'venta', 'detalles.variante.producto'])
            ->find($id);

        if (!$devolucion) {
            return response()->json(['error' => 'Devolución no encontrada'], 404);
        }

        return response()->json($this->formatear($devolucion, true));
    }

    // Devuelve las unidades pendientes por sede de origen para una variante.
    // - En ventas nuevas usa detalle_ventas.sede_origen_id.
    // - En ventas online antiguas usa pedidos.items[].origenes.
    // - En ventas POS antiguas usa la sede de la venta.
    // - Descuenta devoluciones anteriores para no devolver dos veces la misma unidad.
    private function origenesDevolucion(Venta $venta, int $varianteId): array
    {
        $detalles = DetalleVenta::where('venta_id', $venta->id)
            ->where('variante_id', $varianteId)
            ->orderBy('id')
            ->get(['id', 'sede_origen_id', 'cantidad']);

        $esOnline = optional($venta->sedeVenta)->nombre === 'Online';
        $buckets = [];

        foreach ($detalles as $detalle) {
            $sedeId = $detalle->sede_origen_id
                ? (int) $detalle->sede_origen_id
                : ($esOnline ? null : (int) $venta->sede_venta_id);

            $buckets[] = [
                'sede_id' => $sedeId,
                'cantidad' => (int) $detalle->cantidad,
            ];
        }

        // Ventas online creadas antes de guardar sede_origen_id: recuperar el
        // reparto desde el pedido original.
        if ($esOnline && collect($buckets)->every(fn ($b) => $b['sede_id'] === null)) {
            $pedido = Pedido::where('factura_numero', $venta->numero_interno)->first();
            $item = $pedido
                ? collect($pedido->items ?? [])->firstWhere('variante_id', $varianteId)
                : null;

            $origenes = $item['origenes'] ?? [];
            if (!empty($origenes)) {
                $buckets = [];
                foreach ($origenes as $origen) {
                    $sedeId = (int) ($origen['sede_id'] ?? 0);
                    $cantidad = (int) ($origen['cantidad'] ?? 0);
                    if ($sedeId > 0 && $cantidad > 0) {
                        $buckets[] = ['sede_id' => $sedeId, 'cantidad' => $cantidad];
                    }
                }

                $total = (int) $detalles->sum('cantidad');
                $cubierto = array_sum(array_column($buckets, 'cantidad'));
                if ($cubierto < $total) {
                    $buckets[] = ['sede_id' => null, 'cantidad' => $total - $cubierto];
                }
            }
        }

        // Descontar lo ya devuelto, en orden, de las sedes de origen.
        $yaDevuelto = (int) DetalleDevolucion::where('variante_id', $varianteId)
            ->where('tipo', 'devuelto')
            ->whereHas('devolucion', fn ($q) => $q->where('venta_id', $venta->id))
            ->sum('cantidad');

        foreach ($buckets as &$bucket) {
            if ($yaDevuelto <= 0) {
                break;
            }
            $restar = min((int) $bucket['cantidad'], $yaDevuelto);
            $bucket['cantidad'] -= $restar;
            $yaDevuelto -= $restar;
        }
        unset($bucket);

        return array_values(array_filter($buckets, fn ($b) => $b['cantidad'] > 0));
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
                'imagen_url' => $producto ? $this->imagenUrl($producto->imagen_url) : null,
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
            'sede_cambio_id' => $d->sede_cambio_id,
            'sede_cambio' => optional($d->sedeCambio)->nombre ?? optional($d->sede)->nombre ?? '—',
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