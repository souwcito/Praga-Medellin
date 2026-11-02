<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use App\Models\DetalleVenta;
use App\Models\Pago;
use App\Models\Inventario;
use App\Models\Factura;
use App\Models\Variante;
use App\Models\Producto;
use App\Models\Empleado;
use App\Models\Sede;
use App\Models\Pedido;
use App\Models\Devolucion;
use App\Models\Abono;
use App\Services\ConsecutivoService;
use App\Services\FechaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class VentaController extends Controller
{
    // Registrar una venta (POS) por VARIANTE
    public function store(Request $request)
    {
        $request->validate([
            'empleado_id' => 'required|integer',
            'sede_venta_id' => 'required|integer',
            'tipo' => 'nullable|string|in:presencial,virtual',
            'nota' => 'nullable|string|max:500',
            'items' => 'required|array',
            'items.*.variante_id' => 'nullable|integer|exists:variantes,id',
            // Sede de la que sale físicamente la unidad. Si no viene, se usa la
            // sede de facturación (comportamiento anterior).
            'items.*.sede_origen_id' => 'nullable|integer|exists:sedes,id',
            'items.*.nombre' => 'nullable|string|max:255',
            'items.*.nota' => 'nullable|string|max:500',
            'items.*.cantidad' => 'required|integer|min:1',
            'items.*.precio_unitario' => 'required|integer',
            'items.*.precio_final' => 'nullable|integer|min:1',
            'pagos' => 'required|array|min:1',
            'pagos.*.metodo_pago' => 'required|string|in:efectivo,banco,addi,sistecredito,bold',
            'pagos.*.monto' => 'required|integer|min:1',
        ]);

        // Cada línea debe ser un producto con variante o una venta relámpago
        // con nombre. Las relámpago no tocan inventario.
        foreach ($request->items as $item) {
            $tieneVariante = !empty($item['variante_id']);
            $tieneNombre = trim((string) ($item['nombre'] ?? '')) !== '';

            if (!$tieneVariante && !$tieneNombre) {
                return response()->json([
                    'error' => 'Cada línea debe tener una variante o un nombre de venta relámpago.',
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            $numeroInterno = 'FAC-' . ConsecutivoService::siguiente('factura');

            // Calcula totales. El precio final puede ser menor (descuento) o
            // mayor (recargo) que el precio unitario; la diferencia se guarda
            // en `descuento` con signo (negativo = recargo).
            $total = 0;
            $lineas = [];
            foreach ($request->items as $item) {
                $precioUnitario = (int) $item['precio_unitario'];
                $precioFinal = isset($item['precio_final']) && $item['precio_final'] !== '' && $item['precio_final'] !== null
                    ? (int) $item['precio_final']
                    : $precioUnitario;
                $cantidad = (int) $item['cantidad'];
                $descuento = ($precioUnitario - $precioFinal) * $cantidad;
                $subtotal = $precioFinal * $cantidad;
                $total += $subtotal;

                $esRelampago = empty($item['variante_id']);
                $lineas[] = [
                    'variante_id' => $esRelampago ? null : (int) $item['variante_id'],
                    'sede_origen_id' => $esRelampago
                        ? null
                        : (int) ($item['sede_origen_id'] ?? $request->sede_venta_id),
                    'nombre' => $esRelampago ? trim((string) ($item['nombre'] ?? '')) : null,
                    'nota' => $esRelampago
                        ? (trim((string) ($item['nota'] ?? '')) ?: null)
                        : null,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'precio_final' => $precioFinal,
                    'descuento' => $descuento,
                    'subtotal' => $subtotal,
                ];
            }

            // Los pagos deben sumar exactamente el total de la venta
            $sumaPagos = collect($request->pagos)->sum('monto');
            if ($sumaPagos !== $total) {
                throw new \Exception('El total de los pagos no coincide con el total de la venta.');
            }

            $venta = Venta::create([
                'empleado_id' => $request->empleado_id,
                'sede_venta_id' => $request->sede_venta_id,
                'tipo' => $request->tipo ?? 'presencial',
                'numero_interno' => $numeroInterno,
                'total' => $total,
                'nota' => $request->filled('nota') ? $request->nota : null,
            ]);

            $itemsSalida = [];
            $sedesAfectadas = [];
            foreach ($lineas as $linea) {
                DetalleVenta::create([
                    'venta_id' => $venta->id,
                    'variante_id' => $linea['variante_id'],
                    'sede_origen_id' => $linea['sede_origen_id'],
                    'nombre' => $linea['nombre'],
                    'nota' => $linea['nota'],
                    'cantidad' => $linea['cantidad'],
                    'precio_unitario' => $linea['precio_unitario'],
                    'descuento' => $linea['descuento'],
                    'subtotal' => $linea['subtotal'],
                ]);

                $esRelampago = $linea['variante_id'] === null;

                if (!$esRelampago) {
                    // Cada línea descuenta el stock de SU sede de origen: una
                    // misma factura puede sacar productos de varias sedes.
                    $inv = Inventario::where('sede_id', $linea['sede_origen_id'])
                        ->where('variante_id', $linea['variante_id'])
                        ->lockForUpdate()
                        ->first();
                    if (!$inv) {
                        $sedeNombre = optional(Sede::find($linea['sede_origen_id']))->nombre ?? 'la sede';
                        throw new \Exception("La variante no tiene inventario en {$sedeNombre}.");
                    }
                    if ($inv->stock < $linea['cantidad']) {
                        $sedeNombre = optional(Sede::find($linea['sede_origen_id']))->nombre ?? 'la sede';
                        throw new \Exception("Stock insuficiente en {$sedeNombre} para la variante solicitada.");
                    }
                    $inv->stock -= $linea['cantidad'];
                    $inv->save();
                    $sedesAfectadas[$linea['sede_origen_id']] = true;

                    $variante = Variante::with('producto')->find($linea['variante_id']);
                    $itemsSalida[] = [
                        'variante_id' => $linea['variante_id'],
                        'sede_origen_id' => $linea['sede_origen_id'],
                        'nombre' => $variante->producto->nombre,
                        'talla' => $variante->talla,
                        'es_relampago' => false,
                        'nota' => null,
                        'cantidad' => $linea['cantidad'],
                        'precio_unitario' => $linea['precio_unitario'],
                        'precio_final' => $linea['precio_final'],
                        'descuento' => $linea['descuento'],
                        'subtotal' => $linea['subtotal'],
                    ];
                } else {
                    $itemsSalida[] = [
                        'variante_id' => null,
                        'sede_origen_id' => null,
                        'nombre' => $linea['nombre'],
                        'talla' => null,
                        'es_relampago' => true,
                        'nota' => $linea['nota'],
                        'cantidad' => $linea['cantidad'],
                        'precio_unitario' => $linea['precio_unitario'],
                        'precio_final' => $linea['precio_final'],
                        'descuento' => $linea['descuento'],
                        'subtotal' => $linea['subtotal'],
                    ];
                }
            }

            foreach ($request->pagos as $pago) {
                Pago::create([
                    'venta_id' => $venta->id,
                    'metodo_pago' => $pago['metodo_pago'],
                    'monto' => (int) $pago['monto'],
                ]);
            }

            // La venta descuenta stock: invalida la caché del stock de cada sede
            // de la que salió algún producto (puede ser más de una).
            foreach (array_keys($sedesAfectadas) as $sedeAfectada) {
                Cache::forget(InventarioController::claveSede((int) $sedeAfectada));
            }

            $factura = Factura::create([
                'venta_id' => $venta->id,
                'numero_interno' => $numeroInterno,
            ]);

            DB::commit();

            // El stock de la tienda se refresca solo (caché de 60 s). No se
            // invalida toda la lista en cada venta: hacerlo provocaba consultas
            // frías de 8-15 s y errores 500 en horas de alta rotación.

            $sede = Sede::find($venta->sede_venta_id);
            $vendedor = Empleado::find($venta->empleado_id);
            $pagos = $venta->pagos->map(fn ($p) => ['metodo_pago' => $p->metodo_pago, 'monto' => (int) $p->monto])->values();

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
                'pagos' => $pagos,
                'sede' => $sede ? $sede->nombre : null,
                'vendedor' => $vendedor ? $vendedor->nombre : null,
                'total' => (int) $venta->total,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al procesar la venta: ' . $e->getMessage()], 400);
        }
    }

    // Editar PRECIOS y PAGOS de una venta ya realizada (sin cambiar productos ni
    // cantidades). Solo el usuario autorizado puede hacerlo.
    public function update(Request $request, $id)
    {
        if (strtolower((string) optional($request->user())->email) !== 'juan@pragamedellin.com') {
            return response()->json(['error' => 'No tienes permiso para editar ventas.'], 403);
        }

        $venta = Venta::with(['detalles', 'pagos'])->find($id);
        if (!$venta) {
            return response()->json(['error' => 'Venta no encontrada'], 404);
        }

        $data = $request->validate([
            'tipo' => 'nullable|string|in:presencial,virtual',
            'items' => 'required|array|min:1',
            'items.*.detalle_id' => 'nullable|integer',
            'items.*.variante_id' => 'nullable|integer',
            'items.*.precio_final' => 'required|integer|min:1',
            'pagos' => 'required|array|min:1',
            'pagos.*.metodo_pago' => 'required|string|in:efectivo,banco,addi,sistecredito,bold',
            'pagos.*.monto' => 'required|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $detalles = $venta->detalles->keyBy('id');

            $total = 0;
            foreach ($data['items'] as $item) {
                $det = !empty($item['detalle_id'])
                    ? $detalles->get((int) $item['detalle_id'])
                    : $venta->detalles->firstWhere('variante_id', $item['variante_id'] ?? null);

                if (!$det) {
                    continue;
                }
                $precioFinal = (int) $item['precio_final'];
                $cantidad = (int) $det->cantidad;
                $det->subtotal = $precioFinal * $cantidad;
                $det->descuento = ((int) $det->precio_unitario - $precioFinal) * $cantidad;
                $det->save();
                $total += (int) $det->subtotal;
            }

            $sumaPagos = collect($data['pagos'])->sum('monto');
            if ((int) $sumaPagos !== (int) $total) {
                throw new \Exception('El total de los pagos no coincide con el total de la venta.');
            }

            $venta->pagos()->delete();
            foreach ($data['pagos'] as $pago) {
                Pago::create([
                    'venta_id' => $venta->id,
                    'metodo_pago' => $pago['metodo_pago'],
                    'monto' => (int) $pago['monto'],
                ]);
            }

            $venta->total = $total;
            if (!empty($data['tipo'])) {
                $venta->tipo = $data['tipo'];
            }
            $venta->save();

            DB::commit();

            // El stock público se refresca con el TTL de la caché; no hace falta
            // invalidar toda la lista por editar una venta.

            return response()->json([
                'ok' => true,
                'venta' => ['id' => $venta->id, 'total' => (int) $total],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al editar la venta: ' . $e->getMessage()], 400);
        }
    }

    // Corrige el monto, método o vendedor de un abono de Plan Separe. Solo Juan.
    // Actualiza el abono, la venta (ingreso), el pago y el total abonado del plan.
    public function updateAbono(Request $request, $id)
    {
        if (strtolower((string) optional($request->user())->email) !== 'juan@pragamedellin.com') {
            return response()->json(['error' => 'No tienes permiso para editar abonos.'], 403);
        }

        $venta = Venta::with(['pagos', 'apartado'])->find($id);
        if (!$venta) {
            return response()->json(['error' => 'Venta no encontrada'], 404);
        }
        if ($venta->tipo !== 'plan_separe' || !$venta->apartado_id) {
            return response()->json(['error' => 'Esta venta no es un abono de Plan Separe.'], 422);
        }

        $data = $request->validate([
            'monto' => 'required|integer|min:1',
            'metodo_pago' => 'required|string|in:efectivo,transferencia',
            'empleado_id' => 'required|integer|exists:empleados,id',
        ]);

        $apartado = $venta->apartado;
        if (!$apartado) {
            return response()->json(['error' => 'El plan asociado no existe.'], 422);
        }
        if ($apartado->estado === 'cancelado') {
            return response()->json(['error' => 'No se puede editar un abono de un plan cancelado.'], 422);
        }

        // El número de la venta es SEP-XXXX-<abono_id>.
        $abonoId = null;
        if (preg_match('/-(\d+)$/', (string) $venta->numero_interno, $coincide)) {
            $abonoId = (int) $coincide[1];
        }

        $abono = $abonoId
            ? Abono::where('id', $abonoId)->where('apartado_id', $apartado->id)->first()
            : null;

        if (!$abono) {
            return response()->json(['error' => 'No se encontró el abono asociado a esta venta.'], 422);
        }

        $monto = (int) $data['monto'];
        $otrosAbonos = (int) Abono::where('apartado_id', $apartado->id)
            ->where('id', '!=', $abono->id)
            ->sum('monto');

        if ($otrosAbonos + $monto > (int) $apartado->total) {
            return response()->json([
                'error' => 'El abono supera el total del plan. Los otros abonos suman '
                    . number_format($otrosAbonos, 0, ',', '.'),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $abono->monto = $monto;
            $abono->metodo_pago = $data['metodo_pago'];
            $abono->empleado_id = (int) $data['empleado_id'];
            $abono->save();

            $venta->total = $monto;
            $venta->empleado_id = (int) $data['empleado_id'];
            $venta->save();

            $venta->pagos()->delete();
            Pago::create([
                'venta_id' => $venta->id,
                'metodo_pago' => $data['metodo_pago'],
                'monto' => $monto,
            ]);

            $sumaAbonos = (int) Abono::where('apartado_id', $apartado->id)->sum('monto');
            $apartado->abonado = $sumaAbonos;
            $apartado->estado = $sumaAbonos >= (int) $apartado->total
                ? 'completado'
                : 'activo';
            $apartado->save();

            DB::commit();

            $this->bumpCache();

            return response()->json([
                'ok' => true,
                'venta' => [
                    'id' => $venta->id,
                    'total' => $monto,
                    'empleado_id' => (int) $data['empleado_id'],
                ],
                'abono' => [
                    'id' => $abono->id,
                    'monto' => $monto,
                    'metodo_pago' => $data['metodo_pago'],
                    'empleado_id' => (int) $data['empleado_id'],
                ],
                'apartado' => [
                    'id' => $apartado->id,
                    'total' => (int) $apartado->total,
                    'abonado' => (int) $apartado->abonado,
                    'saldo' => max(0, (int) $apartado->total - (int) $apartado->abonado),
                    'estado' => $apartado->estado,
                ],
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => 'No se pudo editar el abono: ' . $e->getMessage()], 400);
        }
    }

    // Revierte por completo una venta de punto físico o de redes:
    // - devuelve el stock a la sede de la venta,
    // - elimina pagos, factura, detalles y la venta.
    // Solo lo puede hacer el usuario autorizado. No aplica a Plan Separe ni a
    // ventas online de Wompi (esas se gestionan desde Pedidos/Wompi).
    public function revertir(Request $request, $id)
    {
        if (strtolower((string) optional($request->user())->email) !== 'juan@pragamedellin.com') {
            return response()->json(['error' => 'No tienes permiso para revertir ventas.'], 403);
        }

        $venta = Venta::with(['detalles', 'pagos', 'factura', 'sedeVenta'])->find($id);

        if (!$venta) {
            return response()->json(['error' => 'Venta no encontrada'], 404);
        }

        if ($venta->tipo === 'plan_separe' || $venta->apartado_id) {
            return response()->json([
                'error' => 'No se puede revertir un abono de Plan Separe desde Ventas.',
            ], 422);
        }

        if (!in_array($venta->tipo, ['presencial', 'virtual'], true)) {
            return response()->json([
                'error' => 'Solo se pueden revertir ventas de punto físico o redes.',
            ], 422);
        }

        // Las ventas online se registran en la sede "Online". Si además existe
        // la columna de factura del pedido, se confirma por número de factura.
        $esOnline = optional($venta->sedeVenta)->nombre === 'Online';
        if (!$esOnline && Schema::hasColumn('pedidos', 'factura_numero')) {
            $esOnline = Pedido::where('factura_numero', $venta->numero_interno)->exists();
        }

        if ($esOnline) {
            return response()->json([
                'error' => 'Es una venta online (Wompi). Gestiona la reversión desde Pedidos/Wompi.',
            ], 422);
        }

        if (Devolucion::where('venta_id', $venta->id)->exists()) {
            return response()->json([
                'error' => 'La venta tiene devoluciones o cambios registrados. No se puede revertir completa.',
            ], 422);
        }

        if ($venta->detalles->isEmpty()) {
            return response()->json([
                'error' => 'La venta no tiene productos para devolver al inventario.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $sedeId = (int) $venta->sede_venta_id;
            $unidadesDevueltas = 0;
            $sedesAfectadas = [];

            foreach ($venta->detalles as $detalle) {
                // Las líneas de venta relámpago no tienen variante ni stock.
                if ($detalle->variante_id === null) {
                    continue;
                }

                $cantidad = (int) $detalle->cantidad;
                // Cada unidad vuelve a la sede de la que salió (venta multi-sede).
                $sedeOrigenId = (int) ($detalle->sede_origen_id ?: $sedeId);

                $inv = Inventario::firstOrCreate(
                    ['sede_id' => $sedeOrigenId, 'variante_id' => $detalle->variante_id],
                    ['stock' => 0],
                );
                $inv->stock = (int) $inv->stock + $cantidad;
                $inv->save();
                $sedesAfectadas[$sedeOrigenId] = true;

                $unidadesDevueltas += $cantidad;
            }

            $factura = optional($venta->factura)->numero_interno ?? $venta->numero_interno;
            $ventaId = $venta->id;
            $total = (int) $venta->total;

            $venta->pagos()->delete();
            $venta->factura()->delete();
            $venta->detalles()->delete();
            $venta->delete();

            DB::commit();

            Cache::forget(InventarioController::claveSede($sedeId));
            foreach (array_keys($sedesAfectadas) as $sedeAfectada) {
                Cache::forget(InventarioController::claveSede((int) $sedeAfectada));
            }
            $this->bumpCache();

            return response()->json([
                'ok' => true,
                'venta_id' => $ventaId,
                'factura' => $factura,
                'total' => $total,
                'unidades_devueltas' => $unidadesDevueltas,
                'sede_id' => $sedeId,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'No se pudo revertir la venta: ' . $e->getMessage(),
            ], 400);
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

        $venta = Venta::with(['empleado', 'sedeVenta', 'pagos', 'detalles.variante.producto', 'detalles.sedeOrigen'])
            ->where('numero_interno', $numero)
            ->first();

        if (!$venta) {
            return response()->json(['error' => 'No se encontró ninguna venta con esa factura'], 404);
        }

        $items = $venta->detalles->map(function ($det) {
            $variante = $det->variante;
            $producto = $variante ? $variante->producto : null;
            $esRelampago = $det->variante_id === null;
            return [
                'detalle_id' => $det->id,
                'variante_id' => $det->variante_id,
                'sede_origen_id' => $det->sede_origen_id,
                'sede_origen' => optional($det->sedeOrigen)->nombre,
                'nombre' => $esRelampago
                    ? ($det->nombre ?: 'Venta relámpago')
                    : ($producto ? $producto->nombre : 'Producto ' . $det->variante_id),
                'talla' => $variante ? $variante->talla : null,
                'es_relampago' => $esRelampago,
                'nota' => $esRelampago ? $det->nota : null,
                'cantidad' => (int) $det->cantidad,
                'precio_unitario' => (int) $det->precio_unitario,
                'subtotal' => (int) $det->subtotal,
                'imagen_url' => $producto ? $this->imagenUrl($producto->imagen_url) : null,
            ];
        });

        return response()->json([
            'venta' => [
                'id' => $venta->id,
                'factura' => $venta->numero_interno,
                'fecha' => $venta->created_at->toISOString(),
                'sede_venta' => optional($venta->sedeVenta)->nombre ?? '—',
                'sede_venta_id' => $venta->sede_venta_id,
                'online' => optional($venta->sedeVenta)->nombre === 'Online',
                'empleado' => optional($venta->empleado)->nombre ?? '—',
                'total' => (int) $venta->total,
            ],
            'items' => $items->values(),
            'pagos' => $venta->pagos->map(fn ($p) => ['metodo_pago' => $p->metodo_pago, 'monto' => (int) $p->monto])->values(),
        ]);
    }

    // Historial de ventas con paginación (estilo Laravel)
    public function index(Request $request)
    {
        $query = Venta::with([
            'empleado', 'sedeVenta', 'factura',
            'apartado.cliente', 'apartado.items.variante.producto',
            'pagos', 'detalles.variante.producto', 'detalles.sedeOrigen',
            'devoluciones.detalles.variante.producto',
            'devoluciones.empleado', 'devoluciones.sedeCambio',
        ])->orderByDesc('id');

        if ($request->filled('fecha') && !$this->fechaValida((string) $request->fecha)) {
            return response()->json(['error' => 'La fecha debe tener formato YYYY-MM-DD.'], 422);
        }
        if ($request->filled('fecha')) {
            [$inicio, $fin] = FechaService::rangoDiaLocal((string) $request->fecha);
            $query->whereBetween('created_at', [$inicio, $fin]);
        } elseif ($request->filled('periodo')) {
            $query->where('created_at', '>=', FechaService::inicioPeriodo($request->periodo));
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

        // Datos para que el panel sepa si una venta se puede revertir sin hacer
        // una consulta por fila: ventas online de Wompi y ventas con devoluciones.
        $facturasPagina = $paginated->pluck('numero_interno')->filter()->values()->all();
        $online = collect();
        if ($facturasPagina && Schema::hasColumn('pedidos', 'factura_numero')) {
            $online = Pedido::whereIn('factura_numero', $facturasPagina)
                ->pluck('factura_numero')
                ->flip();
        }
        $data = $paginated->map(function ($v) use ($online) {
            return [
                'id' => $v->id,
                // Los abonos del Plan Separe no tienen factura FAC-: se muestra el
                // número del plan (SEP-XXXX).
                'factura' => optional($v->factura)->numero_interno ?? optional($v->apartado)->numero_interno,
                'apartado_id' => $v->apartado_id,
                'fecha' => $v->created_at->toISOString(),
                'empleado' => ['id' => $v->empleado_id, 'nombre' => optional($v->empleado)->nombre ?? '—'],
                'empleado_id' => $v->empleado_id,
                'sede_venta' => optional($v->sedeVenta)->nombre ?? '—',
                'sede_venta_id' => $v->sede_venta_id,
                'tipo' => $v->tipo,
                'online' => $online->has($v->numero_interno) ||
                    optional($v->sedeVenta)->nombre === 'Online',
                'tiene_devoluciones' => $v->devoluciones->isNotEmpty(),
                'total' => (int) $v->total,
                'nota' => $v->nota,
                'descuento_total' => (int) $v->detalles->sum(fn ($d) => $d->descuento),
                'pagos' => $v->pagos->map(fn ($p) => ['metodo_pago' => $p->metodo_pago, 'monto' => (int) $p->monto])->values(),
                'items' => $v->detalles->map(function ($d) {
                    $variante = $d->variante;
                    $producto = $variante ? $variante->producto : null;
                    $esRelampago = $d->variante_id === null;
                    return [
                        'detalle_id' => $d->id,
                        'variante_id' => $d->variante_id,
                        'sede_origen_id' => $d->sede_origen_id,
                        'sede_origen' => optional($d->sedeOrigen)->nombre,
                        'nombre' => $esRelampago
                            ? ($d->nombre ?: 'Venta relámpago')
                            : ($producto ? $producto->nombre : 'Producto ' . $d->variante_id),
                        'talla' => $variante ? $variante->talla : null,
                        'es_relampago' => $esRelampago,
                        'nota' => $esRelampago ? $d->nota : null,
                        'cantidad' => (int) $d->cantidad,
                        'precio_unitario' => (int) $d->precio_unitario,
                        'precio_final' => $d->cantidad > 0 ? (int) round($d->subtotal / $d->cantidad) : (int) $d->precio_unitario,
                        'descuento' => (int) $d->descuento,
                        'subtotal' => (int) $d->subtotal,
                        'imagen_url' => $producto ? $this->imagenUrl($producto->imagen_url) : null,
                    ];
                })->values(),
                // Devoluciones y cambios: qué devolvió el cliente y qué se llevó.
                'devoluciones' => $v->devoluciones
                    ->map(fn ($d) => $this->formatearDevolucion($d))
                    ->values(),
                // Plan Separe: resumen del plan (para quién y qué se apartó).
                'plan_separe' => $v->apartado ? [
                    'numero_interno' => $v->apartado->numero_interno,
                    'cliente' => [
                        'nombre' => optional($v->apartado->cliente)->nombre ?? '—',
                        'telefono' => optional($v->apartado->cliente)->telefono,
                    ],
                    'total' => (int) $v->apartado->total,
                    'abonado' => (int) $v->apartado->abonado,
                    'saldo' => max(0, (int) $v->apartado->total - (int) $v->apartado->abonado),
                    'items' => $v->apartado->items->map(function ($it) {
                        $variante = $it->variante;
                        $producto = $variante ? $variante->producto : null;
                        return [
                            'variante_id' => $it->variante_id,
                            'nombre' => $producto ? $producto->nombre : 'Producto ' . $it->variante_id,
                            'talla' => $variante ? $variante->talla : null,
                            'cantidad' => (int) $it->cantidad,
                            'precio_unitario' => (int) $it->precio_unitario,
                            'subtotal' => (int) $it->subtotal,
                            'imagen_url' => $producto ? $this->imagenUrl($producto->imagen_url) : null,
                        ];
                    })->values(),
                ] : null,
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

    // Calendario de ventas: agregados por día del mes + detalle del día elegido.
    public function calendario(Request $request)
    {
        $mes = (string) $request->query('mes', now(FechaService::ZONA)->format('Y-m'));
        $anioMes = (int) substr($mes, 0, 4);
        $numeroMes = (int) substr($mes, 5, 2);

        if (!preg_match('/^\d{4}-\d{2}$/', $mes) || $numeroMes < 1 || $numeroMes > 12) {
            return response()->json(['error' => 'El mes debe tener formato YYYY-MM.'], 422);
        }

        $fecha = (string) $request->query('fecha', '');
        if ($fecha !== '' && !$this->fechaValida($fecha)) {
            return response()->json(['error' => 'La fecha debe tener formato YYYY-MM-DD.'], 422);
        }

        $inicioMes = Carbon::create($anioMes, $numeroMes, 1, 0, 0, 0, FechaService::ZONA);
        $finMes = $inicioMes->copy()->endOfMonth();
        $inicioMesUtc = $inicioMes->copy()->utc();
        $finMesUtc = $finMes->copy()->utc();

        $fechaDetalle = $fecha !== '' ? $fecha : now(FechaService::ZONA)->toDateString();
        [$inicioDia, $finDia] = FechaService::rangoDiaLocal($fechaDetalle);

        $sedeId = $request->filled('sede_id') ? (int) $request->sede_id : null;
        $empleadoId = $request->filled('empleado_id') ? (int) $request->empleado_id : null;
        $tipo = $request->filled('tipo') ? (string) $request->tipo : null;

        $base = Venta::with([
            'detalles.variante.producto',
            'pagos',
            'empleado',
            'sedeVenta',
        ]);

        if ($sedeId) {
            $base->where('sede_venta_id', $sedeId);
        }
        if ($empleadoId) {
            $base->where('empleado_id', $empleadoId);
        }
        if ($tipo) {
            $base->where('tipo', $tipo);
        }

        $ventasMes = (clone $base)
            ->whereBetween('created_at', [$inicioMesUtc, $finMesUtc])
            ->get();
        $ventasDia = (clone $base)
            ->whereBetween('created_at', [$inicioDia, $finDia])
            ->get();

        $dias = $ventasMes
            ->groupBy(fn ($v) => $v->created_at->setTimezone(FechaService::ZONA)->toDateString())
            ->map(function ($ventas, $fechaDia) {
                $total = (int) $ventas->sum('total');
                $numeroVentas = $ventas->count();

                return [
                    'fecha' => $fechaDia,
                    'ventas' => $numeroVentas,
                    'total' => $total,
                    'unidades' => (int) $ventas->sum(
                        fn ($v) => $v->detalles->sum('cantidad')
                    ),
                    'ticket_promedio' => $numeroVentas
                        ? (int) round($total / $numeroVentas)
                        : 0,
                ];
            })
            ->sortBy('fecha')
            ->values();

        $devolucionesBase = Devolucion::query();
        if ($sedeId) {
            $devolucionesBase->where('sede_id', $sedeId);
        }
        if ($empleadoId) {
            $devolucionesBase->whereHas(
                'venta',
                fn ($q) => $q->where('empleado_id', $empleadoId)
            );
        }
        if ($tipo) {
            $devolucionesBase->whereHas(
                'venta',
                fn ($q) => $q->where('tipo', $tipo)
            );
        }

        $devolucionesMes = (clone $devolucionesBase)
            ->whereBetween('created_at', [$inicioMesUtc, $finMesUtc])
            ->get();
        $devolucionesDia = (clone $devolucionesBase)
            ->whereBetween('created_at', [$inicioDia, $finDia])
            ->get();

        $resumenMes = $this->resumenVentas($ventasMes);
        $resumenDia = $this->resumenVentas($ventasDia);
        $devolucionesMesResumen = $this->resumenDevoluciones($devolucionesMes);
        $devolucionesDiaResumen = $this->resumenDevoluciones($devolucionesDia);

        return response()->json([
            'mes' => $mes,
            'fecha' => $fechaDetalle,
            'dias' => $dias,
            'resumen_mes' => array_merge($resumenMes, [
                'devoluciones' => $devolucionesMesResumen,
                'neto' => $resumenMes['total'] - $devolucionesMesResumen['reembolsado'],
            ]),
            'resumen_dia' => array_merge($resumenDia, [
                'devoluciones' => $devolucionesDiaResumen,
                'neto' => $resumenDia['total'] - $devolucionesDiaResumen['reembolsado'],
            ]),
        ]);
    }

    // Formato de una devolución/cambio para mostrarla dentro de la venta.
    private function formatearDevolucion(Devolucion $d): array
    {
        $items = $d->detalles->map(function ($det) {
            $variante = $det->variante;
            $producto = $variante ? $variante->producto : null;
            return [
                'id' => $det->id,
                'tipo' => $det->tipo,
                'variante_id' => $det->variante_id,
                'nombre' => $producto ? $producto->nombre : 'Producto ' . $det->variante_id,
                'talla' => $variante ? $variante->talla : null,
                'cantidad' => (int) $det->cantidad,
                'precio_unitario' => (int) $det->precio_unitario,
                'subtotal' => (int) $det->cantidad * (int) $det->precio_unitario,
                'imagen_url' => $producto ? $this->imagenUrl($producto->imagen_url) : null,
            ];
        })->values();

        return [
            'id' => $d->id,
            'numero_interno' => $d->numero_interno,
            'tipo' => $d->tipo ?? 'cambio',
            'fecha' => $d->created_at->toISOString(),
            'empleado' => optional($d->empleado)->nombre ?? '—',
            'sede_cambio' => optional($d->sedeCambio)->nombre,
            'total_devuelto' => (int) $d->total_devuelto,
            'total_cambio' => (int) $d->total_cambio,
            'diferencia' => (int) $d->diferencia,
            'monto_pagado' => $d->monto_pagado !== null ? (int) $d->monto_pagado : null,
            'vuelto' => (($d->tipo ?? 'cambio') === 'cambio'
                && (int) $d->diferencia > 0
                && $d->monto_pagado !== null)
                ? max(0, (int) $d->monto_pagado - (int) $d->diferencia)
                : 0,
            'metodo_pago' => $d->metodo_pago,
            'motivo' => $d->motivo,
            'items' => $items,
        ];
    }

    private function resumenVentas($ventas): array
    {
        $total = (int) $ventas->sum('total');
        $numeroVentas = $ventas->count();
        $unidades = (int) $ventas->sum(fn ($v) => $v->detalles->sum('cantidad'));
        $descuento = (int) $ventas->sum(fn ($v) => $v->detalles->sum('descuento'));

        $porTipo = $ventas
            ->groupBy('tipo')
            ->map(fn ($vs, $t) => [
                'tipo' => $t,
                'ventas' => $vs->count(),
                'total' => (int) $vs->sum('total'),
            ])
            ->values();

        $porHora = [];
        for ($hora = 0; $hora < 24; $hora++) {
            $porHora[] = ['hora' => $hora, 'ventas' => 0, 'total' => 0];
        }
        foreach ($ventas as $venta) {
            $hora = $venta->created_at->setTimezone(FechaService::ZONA)->hour;
            $porHora[$hora]['ventas']++;
            $porHora[$hora]['total'] += (int) $venta->total;
        }

        $porMetodo = [];
        foreach ($ventas as $venta) {
            foreach ($venta->pagos as $pago) {
                $metodo = $pago->metodo_pago;
                if (!isset($porMetodo[$metodo])) {
                    $porMetodo[$metodo] = [
                        'metodo_pago' => $metodo,
                        'monto' => 0,
                        'pagos' => 0,
                    ];
                }
                $porMetodo[$metodo]['monto'] += (int) $pago->monto;
                $porMetodo[$metodo]['pagos']++;
            }
        }

        $porSede = $ventas
            ->groupBy('sede_venta_id')
            ->map(fn ($vs, $sedeId) => [
                'sede_id' => (int) $sedeId,
                'sede' => optional($vs->first()->sedeVenta)->nombre ?? '—',
                'ventas' => $vs->count(),
                'total' => (int) $vs->sum('total'),
            ])
            ->sortByDesc('total')
            ->values();

        $productos = [];
        foreach ($ventas as $venta) {
            foreach ($venta->detalles as $detalle) {
                $producto = $detalle->variante?->producto;
                $nombre = $producto?->nombre ?? $detalle->nombre ?? 'Producto';
                $clave = $producto ? 'p' . $producto->id : 'r' . $nombre;

                if (!isset($productos[$clave])) {
                    $productos[$clave] = [
                        'nombre' => $nombre,
                        'cantidad' => 0,
                        'total' => 0,
                    ];
                }
                $productos[$clave]['cantidad'] += (int) $detalle->cantidad;
                $productos[$clave]['total'] += (int) $detalle->subtotal;
            }
        }

        $topProductos = collect(array_values($productos))
            ->sortByDesc('total')
            ->take(5)
            ->values();

        $topVendedores = $ventas
            ->groupBy('empleado_id')
            ->map(fn ($vs, $empleadoId) => [
                'empleado_id' => (int) $empleadoId,
                'nombre' => optional($vs->first()->empleado)->nombre ?? '—',
                'ventas' => $vs->count(),
                'total' => (int) $vs->sum('total'),
            ])
            ->sortByDesc('total')
            ->take(5)
            ->values();

        return [
            'ventas' => $numeroVentas,
            'total' => $total,
            'unidades' => $unidades,
            'descuento' => $descuento,
            'ticket_promedio' => $numeroVentas
                ? (int) round($total / $numeroVentas)
                : 0,
            'por_hora' => $porHora,
            'por_metodo' => array_values($porMetodo),
            'por_sede' => $porSede,
            'por_tipo' => $porTipo,
            'top_productos' => $topProductos,
            'top_vendedores' => $topVendedores,
        ];
    }

    private function resumenDevoluciones($devoluciones): array
    {
        return [
            'cantidad' => $devoluciones->count(),
            'total_devuelto' => (int) $devoluciones->sum('total_devuelto'),
            'reembolsado' => (int) $devoluciones
                ->where('tipo', 'reembolso')
                ->sum('total_devuelto'),
        ];
    }

    private function fechaValida(string $fecha): bool
    {
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $fecha, $partes)) {
            return false;
        }

        return checkdate((int) $partes[2], (int) $partes[3], (int) $partes[1]);
    }
}