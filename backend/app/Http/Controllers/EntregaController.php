<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\DetalleVenta;
use App\Models\Entrega;
use App\Models\EntregaItem;
use App\Models\Factura;
use App\Models\Inventario;
use App\Models\Pago;
use App\Models\Sede;
use App\Models\Variante;
use App\Models\Venta;
use App\Services\ConsecutivoService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class EntregaController extends Controller
{
    // Domicilios contra entrega / entregas en prueba.
    //
    // Flujo: al despachar se descuenta el stock de la sede de origen de cada
    // prenda y la entrega queda PENDIENTE (no se factura todavía). Cuando el
    // cliente decide, se marca qué se quedó, se devuelve lo rechazado al stock
    // y se genera la factura normal (Venta + detalle + pagos).

    public function index(Request $request)
    {
        $query = Entrega::with([
            'cliente', 'sede', 'empleado', 'venta',
            'items.variante.producto', 'items.sedeOrigen',
        ]);

        if ($request->filled('estado') && $request->estado !== 'todas') {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('sede_id')) {
            $query->where('sede_id', $request->sede_id);
        }
        if ($request->filled('empleado_id')) {
            $query->where('empleado_id', $request->empleado_id);
        }
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($w) use ($q) {
                $w->where('numero', 'like', "%{$q}%")
                    ->orWhere('telefono', 'like', "%{$q}%")
                    ->orWhereHas('cliente', function ($c) use ($q) {
                        $c->where('nombre', 'like', "%{$q}%")
                            ->orWhere('telefono', 'like', "%{$q}%");
                    });
            });
        }

        // Los pendientes se ven primero por fecha de entrega (los más viejos
        // arriba) para que sea evidente cuál lleva más días sin facturar.
        if (($request->estado ?? 'pendiente') === 'pendiente') {
            $query->orderByRaw('COALESCE(fecha_entrega, created_at) asc')->orderBy('id');
        } else {
            $query->orderByDesc('id');
        }

        $perPage = (int) ($request->per_page ?? 12);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->map(fn ($e) => $this->formatear($e, true))->values(),
            'meta' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ],
        ]);
    }

    // Contador para el menú y la tarjeta del dashboard.
    public function resumen()
    {
        $pendientes = Entrega::where('estado', 'pendiente')
            ->get(['id', 'total', 'fecha_entrega', 'created_at', 'sede_id']);

        $masAntigua = $pendientes
            ->sortBy(fn ($e) => ($e->fecha_entrega ?? $e->created_at)->timestamp)
            ->first();

        $diasMax = 0;
        if ($masAntigua) {
            $base = ($masAntigua->fecha_entrega ?? $masAntigua->created_at)->copy()->startOfDay();
            $diasMax = max(0, (int) $base->diffInDays(now()->startOfDay()));
        }

        $porSede = $pendientes
            ->groupBy('sede_id')
            ->map(fn ($grupo, $sedeId) => [
                'sede_id' => (int) $sedeId,
                'sede' => optional(Sede::find($sedeId))->nombre ?? '—',
                'cantidad' => $grupo->count(),
                'total' => (int) $grupo->sum('total'),
            ])
            ->values();

        return response()->json([
            'cantidad' => $pendientes->count(),
            'total' => (int) $pendientes->sum('total'),
            'dias_max' => $diasMax,
            'mas_antigua' => $masAntigua ? $this->formatear($masAntigua->load('cliente')) : null,
            'por_sede' => $porSede,
        ]);
    }

    public function show($id)
    {
        $entrega = $this->buscar($id);
        if (!$entrega) {
            return response()->json(['error' => 'Domicilio no encontrado.'], 404);
        }

        return response()->json($this->formatear($entrega, true));
    }

    // Crea el domicilio y DESCUENTA el stock de la sede de origen de cada
    // producto. Solo el nombre del cliente es obligatorio; teléfono y
    // dirección son opcionales.
    public function store(Request $request)
    {
        $request->validate([
            'cliente_id' => 'nullable|integer|exists:clientes,id',
            'cliente_nombre' => 'required_without:cliente_id|string|max:255',
            'telefono' => 'nullable|string|max:30',
            'direccion' => 'nullable|string|max:255',
            'sede_id' => 'required|integer|exists:sedes,id',
            'empleado_id' => 'required|integer|exists:empleados,id',
            'nota' => 'nullable|string|max:500',
            'fecha_entrega' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.variante_id' => 'required|integer|exists:variantes,id',
            'items.*.cantidad' => 'required|integer|min:1',
            'items.*.sede_origen_id' => 'nullable|integer|exists:sedes,id',
            'items.*.precio_final' => 'nullable|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $sedeId = (int) $request->sede_id;

            // Cliente: se reutiliza si viene por id; si no, se busca por nombre
            // (así no se duplica el cliente en cada domicilio) y solo se crea
            // cuando no existe. Teléfono y dirección son opcionales.
            if ($request->cliente_id) {
                $cliente = Cliente::find($request->cliente_id);
                if (!$cliente) {
                    throw new \Exception('El cliente no existe.');
                }
            } else {
                $nombre = trim((string) $request->cliente_nombre);
                $cliente = Cliente::where('nombre', $nombre)->first();

                if (!$cliente) {
                    $cliente = Cliente::create([
                        'nombre' => $nombre,
                        'telefono' => null,
                        'direccion' => null,
                        'ciudad' => 'Medellín',
                    ]);
                }
            }

            if (!$cliente->telefono && $request->filled('telefono')) {
                $cliente->telefono = $request->telefono;
            }
            if (!$cliente->direccion && $request->filled('direccion')) {
                $cliente->direccion = $request->direccion;
            }
            $cliente->save();

            $total = 0;
            $itemsRow = [];
            foreach ($request->items as $it) {
                $cantidad = (int) $it['cantidad'];
                $sedeOrigenId = (int) ($it['sede_origen_id'] ?? $sedeId);

                $variante = Variante::with('producto')->find($it['variante_id']);
                if (!$variante || !$variante->producto) {
                    throw new \Exception('Producto inválido.');
                }

                $precio = (int) $variante->producto->precio;
                $precioFinal = isset($it['precio_final']) && $it['precio_final'] !== null && $it['precio_final'] !== ''
                    ? (int) $it['precio_final']
                    : $precio;
                if ($precioFinal < 1) {
                    $precioFinal = $precio;
                }

                $inv = Inventario::where('sede_id', $sedeOrigenId)
                    ->where('variante_id', $variante->id)
                    ->lockForUpdate()
                    ->first();
                if (!$inv || $inv->stock < $cantidad) {
                    $t = $variante->talla ? " (Talla {$variante->talla})" : '';
                    $sedeNombre = optional(Sede::find($sedeOrigenId))->nombre ?? 'la sede';
                    throw new \Exception(
                        "Stock insuficiente para {$variante->producto->nombre}{$t} en {$sedeNombre}."
                    );
                }

                $inv->stock -= $cantidad;
                $inv->save();

                $subtotal = $precioFinal * $cantidad;
                $total += $subtotal;

                $itemsRow[] = [
                    'variante_id' => $variante->id,
                    'sede_origen_id' => $sedeOrigenId,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioFinal,
                    'subtotal' => $subtotal,
                ];
            }

            $entrega = Entrega::create([
                'numero' => 'DOM-' . ConsecutivoService::siguiente('entrega'),
                'cliente_id' => $cliente->id,
                'sede_id' => $sedeId,
                'empleado_id' => (int) $request->empleado_id,
                'direccion' => $request->filled('direccion') ? $request->direccion : null,
                'telefono' => $request->filled('telefono') ? $request->telefono : null,
                'nota' => $request->filled('nota') ? $request->nota : null,
                'total' => $total,
                'estado' => 'pendiente',
                'fecha_entrega' => $request->filled('fecha_entrega')
                    ? Carbon::parse($request->fecha_entrega)
                    : now(),
            ]);

            foreach ($itemsRow as $row) {
                EntregaItem::create([
                    'entrega_id' => $entrega->id,
                    'variante_id' => $row['variante_id'],
                    'sede_origen_id' => $row['sede_origen_id'],
                    'cantidad' => $row['cantidad'],
                    'cantidad_facturada' => null,
                    'precio_unitario' => $row['precio_unitario'],
                    'subtotal' => $row['subtotal'],
                ]);
            }

            $this->olvidarStock($itemsRow);

            DB::commit();

            return response()->json(
                $this->formatear($this->buscar($entrega->id), true),
                201
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'No se pudo crear el domicilio: ' . $e->getMessage()], 400);
        }
    }

    // Factura lo que el cliente se llevó. Lo que devuelve vuelve al stock de su
    // sede de origen. Genera una venta normal (FAC-) con sus pagos.
    public function facturar(Request $request, $id)
    {
        $request->validate([
            'empleado_id' => 'nullable|integer|exists:empleados,id',
            'nota' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer',
            'items.*.cantidad_facturada' => 'required|integer|min:0',
            'pagos' => 'nullable|array',
            'pagos.*.metodo_pago' => 'required_with:pagos|string|in:efectivo,banco,addi,sistecredito,bold',
            'pagos.*.monto' => 'required_with:pagos|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $entrega = Entrega::with(['items', 'cliente'])
                ->lockForUpdate()
                ->find($id);

            if (!$entrega) {
                DB::rollBack();
                return response()->json(['error' => 'Domicilio no encontrado.'], 404);
            }
            if ($entrega->estado !== 'pendiente') {
                throw new \Exception('Este domicilio ya fue facturado o cancelado.');
            }

            // Evita cerrar el domicilio por error si llega un payload incompleto.
            $idsEntrega = $entrega->items->pluck('id')->map(fn ($v) => (int) $v)->all();
            $idsEnviados = collect($request->items)->pluck('id')->map(fn ($v) => (int) $v)->all();
            if (array_diff($idsEnviados, $idsEntrega)) {
                throw new \Exception('Hay productos que no pertenecen a este domicilio.');
            }
            if (count(array_unique($idsEnviados)) !== count($idsEntrega)) {
                throw new \Exception('Debes indicar todos los productos del domicilio.');
            }

            $cantidades = collect($request->items)
                ->mapWithKeys(fn ($it) => [(int) $it['id'] => (int) $it['cantidad_facturada']]);

            $total = 0;
            $lineas = [];
            $devueltas = [];
            foreach ($entrega->items as $item) {
                $facturada = max(0, min((int) $item->cantidad, (int) ($cantidades[$item->id] ?? 0)));
                $devuelta = (int) $item->cantidad - $facturada;

                $item->cantidad_facturada = $facturada;
                $item->save();

                if ($facturada > 0) {
                    $total += (int) $item->precio_unitario * $facturada;
                    $lineas[] = [
                        'variante_id' => $item->variante_id,
                        'sede_origen_id' => $item->sede_origen_id ?: $entrega->sede_id,
                        'cantidad' => $facturada,
                        'precio_unitario' => (int) $item->precio_unitario,
                        'subtotal' => (int) $item->precio_unitario * $facturada,
                    ];
                }

                if ($devuelta > 0) {
                    $devueltas[] = [
                        'variante_id' => $item->variante_id,
                        'sede_origen_id' => $item->sede_origen_id ?: $entrega->sede_id,
                        'cantidad' => $devuelta,
                    ];
                }
            }

            // Nada se llevó: todo vuelve al inventario y el domicilio se cierra.
            if ($total <= 0) {
                $this->devolverStock($devueltas);
                $entrega->estado = 'cancelada';
                $entrega->facturada_at = now();
                $entrega->save();

                DB::commit();

                return response()->json($this->formatear($this->buscar($entrega->id), true));
            }

            $pagos = collect($request->pagos ?? []);
            $sumaPagos = (int) $pagos->sum('monto');
            if ($sumaPagos !== $total) {
                throw new \Exception('El total de los pagos no coincide con el total a facturar.');
            }

            $numeroInterno = 'FAC-' . ConsecutivoService::siguiente('factura');

            $venta = Venta::create([
                'empleado_id' => (int) ($request->empleado_id ?: $entrega->empleado_id),
                'sede_venta_id' => (int) $entrega->sede_id,
                'tipo' => 'presencial',
                'numero_interno' => $numeroInterno,
                'total' => $total,
                'nota' => $request->filled('nota')
                    ? $request->nota
                    : "Domicilio {$entrega->numero}",
            ]);

            foreach ($lineas as $linea) {
                DetalleVenta::create([
                    'venta_id' => $venta->id,
                    'variante_id' => $linea['variante_id'],
                    'sede_origen_id' => $linea['sede_origen_id'],
                    'cantidad' => $linea['cantidad'],
                    'precio_unitario' => $linea['precio_unitario'],
                    'descuento' => 0,
                    'subtotal' => $linea['subtotal'],
                ]);
            }

            foreach ($pagos as $pago) {
                Pago::create([
                    'venta_id' => $venta->id,
                    'metodo_pago' => $pago['metodo_pago'],
                    'monto' => (int) $pago['monto'],
                ]);
            }

            Factura::create([
                'venta_id' => $venta->id,
                'numero_interno' => $numeroInterno,
            ]);

            $this->devolverStock($devueltas);

            $entrega->estado = 'facturada';
            $entrega->facturada_at = now();
            $entrega->venta_id = $venta->id;
            $entrega->save();

            DB::commit();

            return response()->json($this->formatear($this->buscar($entrega->id), true));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'No se pudo facturar el domicilio: ' . $e->getMessage()], 400);
        }
    }

    // Cancela un domicilio pendiente: todo vuelve al stock de su sede de origen.
    public function cancelar($id)
    {
        try {
            DB::beginTransaction();

            $entrega = Entrega::with('items')->lockForUpdate()->find($id);
            if (!$entrega) {
                DB::rollBack();
                return response()->json(['error' => 'Domicilio no encontrado.'], 404);
            }
            if ($entrega->estado !== 'pendiente') {
                throw new \Exception('Solo se puede cancelar un domicilio pendiente.');
            }

            $devueltas = $entrega->items->map(fn ($item) => [
                'variante_id' => $item->variante_id,
                'sede_origen_id' => $item->sede_origen_id ?: $entrega->sede_id,
                'cantidad' => (int) $item->cantidad,
            ])->all();

            $this->devolverStock($devueltas);

            $entrega->estado = 'cancelada';
            $entrega->facturada_at = now();
            $entrega->save();

            DB::commit();

            return response()->json($this->formatear($this->buscar($entrega->id), true));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'No se pudo cancelar el domicilio: ' . $e->getMessage()], 400);
        }
    }

    private function buscar($id): ?Entrega
    {
        return Entrega::with([
            'cliente', 'sede', 'empleado', 'venta',
            'items.variante.producto', 'items.sedeOrigen',
        ])->find($id);
    }

    // Devuelve unidades al inventario de su sede de origen e invalida la caché.
    private function devolverStock(array $lineas): void
    {
        $sedes = [];
        foreach ($lineas as $linea) {
            if (empty($linea['variante_id']) || (int) $linea['cantidad'] <= 0) {
                continue;
            }
            $sedeId = (int) ($linea['sede_origen_id'] ?? 0);
            if (!$sedeId) {
                continue;
            }
            $inv = Inventario::firstOrCreate(
                ['sede_id' => $sedeId, 'variante_id' => $linea['variante_id']],
                ['stock' => 0],
            );
            $inv->stock = (int) $inv->stock + (int) $linea['cantidad'];
            $inv->save();
            $sedes[$sedeId] = true;
        }

        foreach (array_keys($sedes) as $sedeId) {
            Cache::forget(InventarioController::claveSede($sedeId));
        }
    }

    // Invalida la caché del POS de las sedes de las que salió mercancía.
    private function olvidarStock(array $itemsRow): void
    {
        $sedes = [];
        foreach ($itemsRow as $row) {
            if (!empty($row['sede_origen_id'])) {
                $sedes[(int) $row['sede_origen_id']] = true;
            }
        }
        foreach (array_keys($sedes) as $sedeId) {
            Cache::forget(InventarioController::claveSede($sedeId));
        }
    }

    private function formatear(Entrega $entrega, bool $conDetalle = false): array
    {
        $base = ($entrega->fecha_entrega ?? $entrega->created_at)->copy()->startOfDay();
        $dias = (int) $base->diffInDays(now()->startOfDay());

        $items = $entrega->items->map(function ($item) {
            $variante = $item->variante;
            $producto = $variante ? $variante->producto : null;
            return [
                'id' => $item->id,
                'variante_id' => $item->variante_id,
                'sede_origen_id' => $item->sede_origen_id,
                'sede_origen' => optional($item->sedeOrigen)->nombre,
                'nombre' => $producto ? $producto->nombre : 'Producto ' . $item->variante_id,
                'talla' => $variante ? $variante->talla : null,
                'cantidad' => (int) $item->cantidad,
                'cantidad_facturada' => $item->cantidad_facturada !== null
                    ? (int) $item->cantidad_facturada
                    : null,
                'precio_unitario' => (int) $item->precio_unitario,
                'subtotal' => (int) $item->subtotal,
                'imagen_url' => $producto ? $this->imagenUrl($producto->imagen_url) : null,
            ];
        })->values();

        $data = [
            'id' => $entrega->id,
            'numero' => $entrega->numero,
            'estado' => $entrega->estado,
            'fecha' => $entrega->created_at->toISOString(),
            'fecha_entrega' => $entrega->fecha_entrega
                ? $entrega->fecha_entrega->toISOString()
                : null,
            'facturada_at' => $entrega->facturada_at
                ? $entrega->facturada_at->toISOString()
                : null,
            'dias' => max(0, $dias),
            'sede_id' => $entrega->sede_id,
            'sede' => optional($entrega->sede)->nombre ?? '—',
            'cliente' => [
                'id' => $entrega->cliente_id,
                'nombre' => optional($entrega->cliente)->nombre ?? '—',
                'telefono' => optional($entrega->cliente)->telefono,
                'direccion' => optional($entrega->cliente)->direccion,
            ],
            'empleado' => [
                'id' => $entrega->empleado_id,
                'nombre' => optional($entrega->empleado)->nombre ?? '—',
            ],
            'telefono' => $entrega->telefono,
            'direccion' => $entrega->direccion,
            'nota' => $entrega->nota,
            'total' => (int) $entrega->total,
            'total_facturado' => (int) $entrega->items->sum(
                fn ($i) => (int) $i->precio_unitario * (int) ($i->cantidad_facturada ?? 0)
            ),
            'venta_id' => $entrega->venta_id,
            'factura' => optional($entrega->venta)->numero_interno,
            'items' => $items,
            'unidades' => (int) $entrega->items->sum('cantidad'),
            'unidades_facturadas' => (int) $entrega->items->sum(
                fn ($i) => (int) ($i->cantidad_facturada ?? 0)
            ),
        ];

        if ($conDetalle) {
            $data['venta'] = $entrega->venta
                ? [
                    'id' => $entrega->venta->id,
                    'numero_interno' => $entrega->venta->numero_interno,
                    'total' => (int) $entrega->venta->total,
                ]
                : null;
        }

        return $data;
    }
}
