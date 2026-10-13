<?php

namespace App\Http\Controllers;

use App\Models\Apartado;
use App\Models\ApartadoItem;
use App\Models\Abono;
use App\Models\Cliente;
use App\Models\DetalleVenta;
use App\Models\Factura;
use App\Models\Inventario;
use App\Models\Pago;
use App\Models\Variante;
use App\Models\Venta;
use App\Services\ConsecutivoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ApartadoController extends Controller
{
    // Plan Separe: el cliente aparta productos (se descuentan del stock de la
    // sede, saliendo del POS y de la web) y los va abonando. Al completar se
    // genera la factura (Venta); al cancelar las unidades vuelven al stock.

    public function index(Request $request)
    {
        $query = Apartado::with([
            'cliente', 'sede', 'empleado', 'venta',
            'items.variante.producto', 'abonos.empleado',
        ])->orderByDesc('id');

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('sede_id')) {
            $query->where('sede_id', $request->sede_id);
        }
        if ($request->filled('q')) {
            $q = $request->q;
            $query->whereHas('cliente', function ($w) use ($q) {
                $w->where('nombre', 'like', "%{$q}%")
                    ->orWhere('documento', 'like', "%{$q}%");
            });
        }

        $perPage = (int) ($request->per_page ?? 10);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->map(fn ($ap) => $this->formatear($ap))->values(),
            'meta' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $ap = Apartado::with([
            'cliente', 'sede', 'empleado', 'venta',
            'items.variante.producto', 'abonos.empleado',
        ])->find($id);

        if (!$ap) {
            return response()->json(['error' => 'Plan separe no encontrado'], 404);
        }

        return response()->json($this->formatear($ap, true));
    }

    // Crea el plan: crea/elige cliente, valida y DESCUENTA el stock de la sede
    // de cada ítem y registra el ABONO INICIAL obligatorio.
    public function store(Request $request)
    {
        $request->validate([
            'cliente_id' => 'nullable|integer|exists:clientes,id',
            'cliente' => 'required_without:cliente_id|array',
            'cliente.nombre' => 'required_without:cliente_id|string',
            'cliente.documento' => 'nullable|string|max:30',
            'cliente.telefono' => 'nullable|string|max:30',
            'sede_id' => 'required|integer|exists:sedes,id',
            'empleado_id' => 'required|integer|exists:empleados,id',
            'items' => 'required|array|min:1',
            'items.*.variante_id' => 'required|integer',
            'items.*.cantidad' => 'required|integer|min:1',
            'abono_inicial' => 'required|array',
            'abono_inicial.monto' => 'required|integer|min:1',
            'abono_inicial.metodo_pago' => 'required|in:efectivo,transferencia',
        ]);

        try {
            DB::beginTransaction();

            $sedeId = (int) $request->sede_id;

            if ($request->cliente_id) {
                $cliente = Cliente::find($request->cliente_id);
                if (!$cliente) {
                    throw new \Exception('El cliente no existe.');
                }
            } else {
                $cliente = Cliente::create([
                    'nombre' => $request->cliente['nombre'],
                    'documento' => $request->cliente['documento'] ?? null,
                    'telefono' => $request->cliente['telefono'] ?? null,
                    'ciudad' => 'Medellín',
                ]);
            }

            // Valida y prepara los ítems (precio tomado del producto)
            $total = 0;
            $itemsRow = [];
            foreach ($request->items as $it) {
                $cantidad = (int) $it['cantidad'];
                $variante = Variante::with('producto')->find($it['variante_id']);
                if (!$variante || !$variante->producto) {
                    throw new \Exception('Producto inválido.');
                }
                $precio = (int) $variante->producto->precio;
                $inv = Inventario::where('sede_id', $sedeId)
                    ->where('variante_id', $variante->id)
                    ->first();
                if (!$inv || $inv->stock < $cantidad) {
                    $t = $variante->talla ? " (Talla {$variante->talla})" : '';
                    throw new \Exception("Stock insuficiente para {$variante->producto->nombre}{$t} en esta sede.");
                }
                $subtotal = $precio * $cantidad;
                $total += $subtotal;
                $itemsRow[] = [
                    'variante' => $variante,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precio,
                    'subtotal' => $subtotal,
                ];
            }

            $abonoMonto = (int) $request->abono_inicial['monto'];
            if ($abonoMonto > $total) {
                throw new \Exception('El abono inicial no puede superar el valor total.');
            }

            // Descuenta el stock de la sede (el producto sale de POS y de la web)
            foreach ($itemsRow as $r) {
                $inv = Inventario::where('sede_id', $sedeId)
                    ->where('variante_id', $r['variante']->id)
                    ->first();
                $inv->stock -= $r['cantidad'];
                $inv->save();
            }

            $numeroInterno = 'SEP-' . ConsecutivoService::siguiente('apartado');

            $ap = Apartado::create([
                'numero_interno' => $numeroInterno,
                'cliente_id' => $cliente->id,
                'sede_id' => $sedeId,
                'empleado_id' => $request->empleado_id,
                'total' => $total,
                'abonado' => 0,
                'estado' => 'activo',
                'venta_id' => null,
            ]);

            foreach ($itemsRow as $r) {
                ApartadoItem::create([
                    'apartado_id' => $ap->id,
                    'variante_id' => $r['variante']->id,
                    'cantidad' => $r['cantidad'],
                    'precio_unitario' => $r['precio_unitario'],
                    'subtotal' => $r['subtotal'],
                ]);
            }

            Abono::create([
                'apartado_id' => $ap->id,
                'monto' => $abonoMonto,
                'metodo_pago' => $request->abono_inicial['metodo_pago'],
                'empleado_id' => $request->empleado_id,
            ]);

            $ap->abonado = $abonoMonto;
            if ($abonoMonto >= $total) {
                $this->generarVenta($ap);
            } else {
                $ap->save();
            }

            Cache::forget(InventarioController::claveSede($sedeId));
            $this->bumpCache();

            DB::commit();

            return response()->json(
                $this->formatear($ap->fresh(['cliente', 'sede', 'empleado', 'venta', 'items.variante.producto', 'abonos.empleado']), true),
                201
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al crear el plan separe: ' . $e->getMessage()], 400);
        }
    }

    // Registra un abono; al llegar al 100% marca completado y genera la factura.
    public function abonar(Request $request, $id)
    {
        $request->validate([
            'monto' => 'required|integer|min:1',
            'metodo_pago' => 'required|in:efectivo,transferencia',
            'empleado_id' => 'required|integer|exists:empleados,id',
        ]);

        try {
            DB::beginTransaction();

            $ap = Apartado::find($id);
            if (!$ap) {
                return response()->json(['error' => 'Plan separe no encontrado'], 404);
            }
            if ($ap->estado !== 'activo') {
                throw new \Exception('El plan ya fue completado o cancelado.');
            }
            $saldo = (int) $ap->total - (int) $ap->abonado;
            $monto = (int) $request->monto;
            if ($monto > $saldo) {
                throw new \Exception('El abono supera el saldo pendiente.');
            }

            Abono::create([
                'apartado_id' => $ap->id,
                'monto' => $monto,
                'metodo_pago' => $request->metodo_pago,
                'empleado_id' => $request->empleado_id,
            ]);

            $ap->abonado += $monto;
            if ($ap->abonado >= $ap->total) {
                $this->generarVenta($ap); // ya descuenta cache y bump
            } else {
                $ap->save();
            }

            DB::commit();

            return response()->json(
                $this->formatear($ap->fresh(['cliente', 'sede', 'empleado', 'venta', 'items.variante.producto', 'abonos.empleado']), true)
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al registrar el abono: ' . $e->getMessage()], 400);
        }
    }

    // Marca el plan como NO terminado: las unidades vuelven al stock de la sede.
    public function cancelar($id)
    {
        try {
            DB::beginTransaction();

            $ap = Apartado::with(['items'])
                ->find($id);
            if (!$ap) {
                return response()->json(['error' => 'Plan separe no encontrado'], 404);
            }
            if ($ap->estado !== 'activo') {
                throw new \Exception('Solo se puede cancelar un plan en estado activo.');
            }

            foreach ($ap->items as $item) {
                $inv = Inventario::where('sede_id', $ap->sede_id)
                    ->where('variante_id', $item->variante_id)
                    ->first();
                if ($inv) {
                    $inv->stock += $item->cantidad;
                    $inv->save();
                }
            }

            $ap->estado = 'cancelado';
            $ap->save();

            Cache::forget(InventarioController::claveSede((int) $ap->sede_id));
            $this->bumpCache();

            DB::commit();

            return response()->json(
                $this->formatear($ap->fresh(['cliente', 'sede', 'empleado', 'venta', 'items.variante.producto', 'abonos.empleado']), true)
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al cancelar el plan separe: ' . $e->getMessage()], 400);
        }
    }

    // Convierte un plan 100% pagado en una Venta (factura) con los abonos como pagos.
    private function generarVenta(Apartado $ap): void
    {
        if ($ap->venta_id) {
            return;
        }

        $numeroFactura = 'FAC-' . ConsecutivoService::siguiente('factura');
        $venta = Venta::create([
            'empleado_id' => $ap->empleado_id,
            'sede_venta_id' => $ap->sede_id,
            'tipo' => 'presencial',
            'numero_interno' => $numeroFactura,
            'total' => (int) $ap->total,
        ]);

        foreach ($ap->items as $item) {
            DetalleVenta::create([
                'venta_id' => $venta->id,
                'variante_id' => $item->variante_id,
                'cantidad' => $item->cantidad,
                'precio_unitario' => $item->precio_unitario,
                'descuento' => 0,
                'subtotal' => $item->subtotal,
            ]);
        }

        foreach ($ap->abonos as $abono) {
            Pago::create([
                'venta_id' => $venta->id,
                'metodo_pago' => $abono->metodo_pago,
                'monto' => $abono->monto,
            ]);
        }

        Factura::create(['venta_id' => $venta->id, 'numero_interno' => $numeroFactura]);

        $ap->venta_id = $venta->id;
        $ap->estado = 'completado';
        $ap->abonado = (int) $ap->total;
        $ap->save();

        Cache::forget(InventarioController::claveSede((int) $ap->sede_id));
        $this->bumpCache();
    }

    private function formatear(Apartado $ap, bool $conDetalle = false): array
    {
        $total = (int) $ap->total;
        $abonado = (int) $ap->abonado;
        $porcentaje = $total > 0 ? (int) round(($abonado * 100) / $total) : 0;

        $items = $ap->items->map(function ($item) {
            $variante = $item->variante;
            $producto = $variante ? $variante->producto : null;
            return [
                'variante_id' => $item->variante_id,
                'nombre' => $producto ? $producto->nombre : 'Producto ' . $item->variante_id,
                'talla' => $variante ? $variante->talla : null,
                'sku' => $producto ? $producto->sku : null,
                'codigo_barras' => $variante ? $variante->codigo_barras : null,
                'cantidad' => (int) $item->cantidad,
                'precio_unitario' => (int) $item->precio_unitario,
                'subtotal' => (int) $item->subtotal,
                'imagen_url' => $producto ? $this->imagenUrl($producto->imagen_url) : null,
            ];
        })->values();

        $abonos = $ap->abonos->map(function ($ab) {
            return [
                'id' => $ab->id,
                'monto' => (int) $ab->monto,
                'metodo_pago' => $ab->metodo_pago,
                'fecha' => $ab->created_at->toISOString(),
                'empleado' => ['id' => $ab->empleado_id, 'nombre' => optional($ab->empleado)->nombre ?? '—'],
            ];
        })->values();

        $data = [
            'id' => $ap->id,
            'numero_interno' => $ap->numero_interno,
            'estado' => $ap->estado,
            'fecha' => $ap->created_at->toISOString(),
            'sede_id' => $ap->sede_id,
            'sede' => optional($ap->sede)->nombre ?? '—',
            'cliente' => [
                'id' => $ap->cliente_id,
                'nombre' => optional($ap->cliente)->nombre ?? '—',
                'documento' => optional($ap->cliente)->documento ?? null,
                'telefono' => optional($ap->cliente)->telefono ?? null,
            ],
            'empleado' => ['id' => $ap->empleado_id, 'nombre' => optional($ap->empleado)->nombre ?? '—'],
            'total' => $total,
            'abonado' => $abonado,
            'saldo' => max(0, $total - $abonado),
            'porcentaje' => min(100, $porcentaje),
            'venta_id' => $ap->venta_id,
            'factura' => $ap->venta ? $ap->venta->numero_interno : null,
        ];

        if ($conDetalle) {
            $data['items'] = $items;
            $data['abonos'] = $abonos;
            $data['num_abonos'] = $abonos->count();
        }

        return $data;
    }
}