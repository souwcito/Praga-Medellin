<?php

namespace App\Http\Controllers;

use App\Mail\PedidoConfirmacionCliente;
use App\Mail\PedidoNuevoAsesores;
use App\Models\Cliente;
use App\Models\DetalleVenta;
use App\Models\Empleado;
use App\Models\Factura;
use App\Models\Inventario;
use App\Models\Pago;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\Sede;
use App\Models\Variante;
use App\Models\Venta;
use App\Services\ConsecutivoService;
use App\Services\WompiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class PedidoController extends Controller
{
    // Reglas de recompensas de la tienda (compartidas con el frontend).
    private const ENVIO_GRATIS_DESDE = 400000;
    private const FRAGANCIA_DELTA = 100000; // +100.000 tras el envío gratis
    private const DESCUENTO_DELTA = 300000; // +100.000 (fragancia) + 200.000 (5%) tras el envío gratis
    private const FRAGANCIA_SKU = 'FRA01';
    private const PORCENTAJE_DESCUENTO = 5;

    // Historial de pedidos online con toda la información (panel de administración).
    // Solo se muestran los pedidos PAGADOS (los "nuevo"/abandonados se ocultan
    // para no confundir a los empleados).
    public function index()
    {
        $pedidos = Pedido::with('cliente')
            ->whereIn('estado', ['pagado', 'enviado', 'entregado'])
            ->orderByDesc('id')
            ->get();

        $data = $pedidos->map(fn ($p) => $this->formatear($p));

        return response()->json(['data' => $data->values()]);
    }

    // Marca el pedido como "tomado" (alguien se está encargando) para que no lo
    // procesen dos veces. Enviar tomado_por vacío lo libera.
    public function tomar(Request $request, $id)
    {
        $pedido = Pedido::find($id);
        if (!$pedido) {
            return response()->json(['error' => 'Pedido no encontrado'], 404);
        }

        $nombre = trim((string) $request->input('tomado_por'));
        if ($nombre === '') {
            $pedido->tomado_por = null;
            $pedido->tomado_at = null;
        } else {
            $pedido->tomado_por = $nombre;
            $pedido->tomado_at = now();
        }
        $pedido->save();

        return response()->json($this->formatear($pedido));
    }

    // Calcula las metas de recompensas. El ancla es el mayor PRECIO UNITARIO del
    // carrito si supera el envío gratis; si ningún producto lo supera, el umbral.
    private function calcularRecompensas(int $subtotal, int $mayorPrecio): array
    {
        $ancla = max(self::ENVIO_GRATIS_DESDE, $mayorPrecio);

        return [
            'ancla' => $ancla,
            'envio_gratis' => $subtotal >= self::ENVIO_GRATIS_DESDE,
            'fragancia_gratis' => $subtotal >= $ancla + self::FRAGANCIA_DELTA,
            'descuento_5' => $subtotal >= $ancla + self::DESCUENTO_DELTA,
        ];
    }

    // Variante de la fragancia de regalo (prefiere talla única).
    private function fraganciaVariante(): ?Variante
    {
        $producto = Producto::where('sku', self::FRAGANCIA_SKU)->first();
        if (!$producto) {
            return null;
        }

        return Variante::with('producto')
            ->where('producto_id', $producto->id)
            ->orderByRaw('talla IS NULL DESC')
            ->first();
    }

    // Crea/encuentra el cliente y registra el pedido. El TOTAL se recalcula en
    // el servidor con el precio real del producto (no confía en el navegador).
    public function store(Request $request)
    {
        $data = $request->validate([
            'cliente.nombre' => 'required|string',
            'cliente.email' => 'nullable|email',
            'cliente.telefono' => 'nullable|string|max:30',
            'cliente.direccion' => 'nullable|string',
            'cliente.ciudad' => 'nullable|string',
            'cliente.documento' => 'nullable|string|max:30',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|integer',
            'items.*.talla' => 'nullable|string',
            'items.*.cantidad' => 'required|integer|min:1',
        ]);

        $cliente = null;
        if (!empty($data['cliente']['email'])) {
            $cliente = Cliente::where('email', $data['cliente']['email'])->first();
        }
        if (!$cliente && !empty($data['cliente']['documento'])) {
            $cliente = Cliente::where('documento', $data['cliente']['documento'])->first();
        }
        if (!$cliente) {
            $cliente = Cliente::create([
                'nombre' => $data['cliente']['nombre'],
                'email' => $data['cliente']['email'] ?? null,
                'telefono' => $data['cliente']['telefono'] ?? null,
                'direccion' => $data['cliente']['direccion'] ?? null,
                'ciudad' => $data['cliente']['ciudad'] ?? 'Medellín',
                'documento' => $data['cliente']['documento'] ?? null,
            ]);
        }

        // Recalcula el subtotal y arma el snapshot real de los ítems.
        $subtotal = 0;
        $lineaMayor = 0;
        $items = [];
        $yaTieneFragancia = false;

        foreach ($data['items'] as $item) {
            $cantidad = (int) $item['cantidad'];
            $variante = Variante::with('producto')
                ->where('producto_id', $item['producto_id'])
                ->where('talla', $item['talla'] ?? null)
                ->first();

            // Compatibilidad con carritos/folios anteriores a la normalización
            // de tenis (talla "8-41" o "8.5/9-42"): busca la talla USA.
            if (!$variante && !empty($item['talla'])) {
                if (preg_match('/^\s*(\d+(?:[.,]\d+)?)/', (string) $item['talla'], $m)) {
                    $tallaUsa = str_replace(',', '.', $m[1]);
                    if ($tallaUsa !== (string) $item['talla']) {
                        $variante = Variante::with('producto')
                            ->where('producto_id', $item['producto_id'])
                            ->where('talla', $tallaUsa)
                            ->first();
                    }
                }
            }

            if (!$variante || !$variante->producto) {
                return response()->json(['error' => 'Uno de los productos ya no está disponible.'], 400);
            }

            $precio = (int) $variante->producto->precio;
            $sub = $precio * $cantidad;
            $subtotal += $sub;
            $lineaMayor = max($lineaMayor, $precio);

            if ($variante->producto->sku === self::FRAGANCIA_SKU) {
                $yaTieneFragancia = true;
            }

            $items[] = [
                'variante_id' => $variante->id,
                'producto_id' => $variante->producto_id,
                'nombre' => $variante->producto->nombre,
                'talla' => $variante->talla,
                'sku' => $variante->producto->sku,
                'codigo_barras' => $variante->codigo_barras,
                'imagen_url' => $this->imagenUrl($variante->producto->imagen_url),
                'cantidad' => $cantidad,
                'precio_unitario' => $precio,
                'subtotal' => $sub,
            ];
        }

        $recompensas = $this->calcularRecompensas($subtotal, $lineaMayor);
        $descuento = 0;

        // Fragancia Exclusiva de regalo (solo si no la lleva ya en el carrito).
        if ($recompensas['fragancia_gratis'] && !$yaTieneFragancia) {
            $varianteRegalo = $this->fraganciaVariante();
            if ($varianteRegalo && $varianteRegalo->producto) {
                $items[] = [
                    'variante_id' => $varianteRegalo->id,
                    'producto_id' => $varianteRegalo->producto_id,
                    'nombre' => $varianteRegalo->producto->nombre,
                    'talla' => $varianteRegalo->talla,
                    'sku' => $varianteRegalo->producto->sku,
                    'codigo_barras' => $varianteRegalo->codigo_barras,
                    'imagen_url' => $this->imagenUrl($varianteRegalo->producto->imagen_url),
                    'cantidad' => 1,
                    'precio_unitario' => 0,
                    'subtotal' => 0,
                    'es_regalo' => true,
                ];
            }
        }

        if ($recompensas['descuento_5']) {
            $descuento = (int) round($subtotal * self::PORCENTAJE_DESCUENTO / 100);
        }

        $total = $subtotal - $descuento;
        $numero = 'PD-' . strtoupper(uniqid());

        $pedido = Pedido::create([
            'numero' => $numero,
            'referencia' => $numero,
            'cliente_id' => $cliente->id,
            'total' => $total,
            'subtotal' => $subtotal,
            'descuento' => $descuento,
            'recompensas' => $recompensas,
            'estado' => 'nuevo',
            'items' => $items,
        ]);

        return response()->json($this->formatear($pedido), 201);
    }

    // Configuración para el widget de Wompi: solo la llave PÚBLICA y la firma de
    // integridad calculada en el servidor (nunca exponer la llave de integridad).
    public function wompi($numero)
    {
        $pedido = Pedido::where('numero', $numero)->first();
        if (!$pedido) {
            return response()->json(['error' => 'Pedido no encontrado'], 404);
        }

        $wompi = app(WompiService::class);
        $amountCents = (int) $pedido->total * 100;

        return response()->json([
            'public_key' => $wompi->publicKey(),
            'reference' => $pedido->numero,
            'amount_in_cents' => $amountCents,
            'currency' => 'COP',
            'signature' => $wompi->firmaIntegridad($amountCents, 'COP', $pedido->numero),
            'widget_url' => 'https://checkout.wompi.co/widget.js',
            'base_url' => $wompi->baseUrl(),
        ]);
    }

    // Confirmación síncrona: el front End llama con el id de transacción ya
    // aprobado; el servidor valida contra Wompi para no confiar en el navegador.
    public function confirmar(Request $request, $numero)
    {
        $request->validate([
            'wompi_transaction_id' => 'required|string',
        ]);

        $pedido = Pedido::where('numero', $numero)->first();
        if (!$pedido) {
            return response()->json(['error' => 'Pedido no encontrado'], 404);
        }

        // Idempotente: si ya quedó pagado, devuelve el estado actual.
        if ($pedido->estado === 'pagado') {
            return response()->json($this->formatear($pedido));
        }

        $tx = app(WompiService::class)->transaccionAprobada($request->wompi_transaction_id);
        if (!$tx) {
            return response()->json(['error' => 'La transacción no está aprobada.'], 400);
        }

        $esperado = (int) $pedido->total * 100;
        if ($tx['amount_in_cents'] !== $esperado || $tx['currency'] !== 'COP') {
            return response()->json(['error' => 'El monto de la transacción no coincide con el pedido.'], 400);
        }
        if ($tx['reference'] && $tx['reference'] !== $pedido->numero) {
            return response()->json(['error' => 'La transacción no corresponde a este pedido.'], 400);
        }

        $this->marcarPagado($pedido, $tx);

        return response()->json($this->formatear($pedido));
    }

    // Webhook de Wompi (respaldo asíncrono). Valida X-Event-Hash y marca pagado.
    public function webhook(Request $request, WompiService $wompi)
    {
        $payload = $request->getContent();
        $data = json_decode($payload, true) ?? [];

        // La firma viene en el header X-Event-Checksum (o en signature.checksum).
        $checksum = $request->header('X-Event-Checksum') ?? ($data['signature']['checksum'] ?? null);

        if (!$wompi->webhookValido($data, $checksum)) {
            return response()->json(['error' => 'Firma inválida'], 401);
        }

        $transaction = $data['data']['transaction'] ?? null;
        if (!$transaction || ($data['event'] ?? '') !== 'transaction.updated') {
            return response()->json(['ok' => true]);
        }

        $reference = $transaction['reference'] ?? null;
        if ($transaction['status'] === 'APPROVED' && $reference) {
            $pedido = Pedido::where('numero', $reference)->orWhere('referencia', $reference)->first();
            if ($pedido && $pedido->estado !== 'pagado') {
                $this->marcarPagado($pedido, [
                    'id' => $transaction['id'] ?? null,
                    'status' => 'APPROVED',
                    'metodo_pago' => $transaction['payment_method']['type'] ?? $transaction['payment_method_type'] ?? 'tarjeta',
                    'franquicia' => $transaction['payment_method']['extra']['brand'] ?? null,
                    'amount_in_cents' => (int) ($transaction['amount_in_cents'] ?? 0),
                    'currency' => $transaction['currency'] ?? 'COP',
                ]);
            }
        }

        return response()->json(['ok' => true]);
    }

    // Marca el pedido como pagado, DESCUENTA el stock (de donde haya), convierte
    // el pedido en una venta/factura (cuenta como compra) y notifica.
    private function marcarPagado(Pedido $pedido, array $tx): void
    {
        $pedido->estado = 'pagado';
        $pedido->payment_status = 'APPROVED';
        $pedido->wompi_transaction_id = $tx['id'] ?? $pedido->wompi_transaction_id;
        $pedido->metodo_pago = $tx['metodo_pago'] ?? $pedido->metodo_pago;
        $pedido->franquicia = $tx['franquicia'] ?? $pedido->franquicia;
        $pedido->save();

        // El stock y el origen de cada prenda se resuelven SOLO al pagar.
        $this->descontarStock($pedido);

        // Genera factura y registra la venta (para que cuente como compra).
        $this->registrarVentaOnline($pedido);

        $this->notificar($pedido);
    }

    // Convierte el pedido pagado en una Venta + DetalleVenta + Pago + Factura,
    // atribuida a la sede/empleado virtuales. Idempotente por factura_numero.
    private function registrarVentaOnline(Pedido $pedido): void
    {
        if ($pedido->factura_numero) {
            return;
        }

        $sedeOnline = Sede::where('nombre', 'Online')->first();
        $empleadoOnline = Empleado::where('nombre', 'Ventas Online')->first();
        if (!$sedeOnline || !$empleadoOnline) {
            // Sin la sede/empleado virtuales no se puede crear la venta.
            return;
        }

        DB::beginTransaction();
        try {
            $numero = 'FAC-' . ConsecutivoService::siguiente('factura');

            $venta = Venta::create([
                'empleado_id' => $empleadoOnline->id,
                'sede_venta_id' => $sedeOnline->id,
                'tipo' => 'virtual',
                'numero_interno' => $numero,
                'total' => (int) $pedido->total,
            ]);

            $items = $pedido->items ?? [];
            $descuentoTotal = (int) $pedido->descuento;

            // Reparte el 5% proporcionalmente entre las líneas con precio.
            $idxPrecio = [];
            $subtotalPrecio = 0;
            foreach ($items as $i => $it) {
                $precio = (int) ($it['precio_unitario'] ?? 0);
                $cant = (int) ($it['cantidad'] ?? 0);
                if ($precio > 0 && $cant > 0) {
                    $idxPrecio[] = $i;
                    $subtotalPrecio += $precio * $cant;
                }
            }

            $descuentos = array_fill(0, count($items), 0);
            if ($descuentoTotal > 0 && $subtotalPrecio > 0 && $idxPrecio) {
                foreach ($idxPrecio as $i) {
                    $sub = (int) ($items[$i]['precio_unitario'] ?? 0) * (int) ($items[$i]['cantidad'] ?? 0);
                    $descuentos[$i] = (int) floor($descuentoTotal * $sub / $subtotalPrecio);
                }
                $restante = $descuentoTotal - array_sum($descuentos);
                $k = 0;
                while ($restante > 0) {
                    $descuentos[$idxPrecio[$k % count($idxPrecio)]] += 1;
                    $restante--;
                    $k++;
                }
            }

            foreach ($items as $i => $item) {
                $varianteId = (int) ($item['variante_id'] ?? 0);
                if (!$varianteId) {
                    continue;
                }
                $precio = (int) ($item['precio_unitario'] ?? 0);
                $cant = (int) ($item['cantidad'] ?? 0);
                if ($cant <= 0) {
                    continue;
                }
                $descuentoLinea = $descuentos[$i] ?? 0;

                // Reparte la línea entre las sedes de las que realmente salió el
                // stock. Si falta stock, la parte sin origen queda con null.
                $restanteCant = $cant;
                $buckets = [];
                foreach (($item['origenes'] ?? []) as $origen) {
                    $cantOrigen = min($restanteCant, (int) ($origen['cantidad'] ?? 0));
                    if ($cantOrigen <= 0) {
                        continue;
                    }
                    $buckets[] = [
                        'sede_id' => !empty($origen['sede_id']) ? (int) $origen['sede_id'] : null,
                        'cantidad' => $cantOrigen,
                    ];
                    $restanteCant -= $cantOrigen;
                }
                if ($restanteCant > 0) {
                    $buckets[] = ['sede_id' => null, 'cantidad' => $restanteCant];
                }

                $restanteDescuento = $descuentoLinea;
                $ultimo = count($buckets) - 1;
                foreach ($buckets as $idx => $bucket) {
                    $desc = $idx === $ultimo
                        ? $restanteDescuento
                        : (int) floor($descuentoLinea * $bucket['cantidad'] / $cant);
                    $restanteDescuento -= $desc;

                    DetalleVenta::create([
                        'venta_id' => $venta->id,
                        'variante_id' => $varianteId,
                        'sede_origen_id' => $bucket['sede_id'],
                        'cantidad' => $bucket['cantidad'],
                        'precio_unitario' => $precio,
                        'descuento' => $desc,
                        'subtotal' => ($precio * $bucket['cantidad']) - $desc,
                    ]);
                }
            }

            Pago::create([
                'venta_id' => $venta->id,
                'metodo_pago' => 'wompi',
                'monto' => (int) $pedido->total,
            ]);

            Factura::create([
                'venta_id' => $venta->id,
                'numero_interno' => $numero,
            ]);

            $pedido->factura_numero = $numero;
            $pedido->save();

            DB::commit();

            // El stock público se refresca con el TTL de la caché.
        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);
        }
    }

    // Descuenta la cantidad de cada ítem repartiendo entre las sedes con stock
    // (de mayor a menor) y guarda de qué sede sale cada prenda.
    private function descontarStock(Pedido $pedido): void
    {
        $items = $pedido->items ?? [];
        $cambios = false;
        $sedesAfectadas = [];

        foreach ($items as &$item) {
            $varianteId = $item['variante_id'] ?? null;
            $faltan = (int) ($item['cantidad'] ?? 0);
            if (!$varianteId || $faltan <= 0) {
                continue;
            }

            $inventarios = Inventario::where('variante_id', $varianteId)
                ->where('stock', '>', 0)
                ->orderByDesc('stock')
                ->get();

            $origenes = [];
            foreach ($inventarios as $inv) {
                if ($faltan <= 0) {
                    break;
                }
                $tomar = min($faltan, (int) $inv->stock);
                if ($tomar <= 0) {
                    continue;
                }
                $inv->stock -= $tomar;
                $inv->save();

                $sedesAfectadas[] = (int) $inv->sede_id;
                $sede = Sede::find($inv->sede_id);
                $origenes[] = [
                    'sede_id' => (int) $inv->sede_id,
                    'sede' => $sede ? $sede->nombre : 'Sede ' . $inv->sede_id,
                    'cantidad' => $tomar,
                ];
                $faltan -= $tomar;
            }

            $item['origenes'] = $origenes;
            $item['origen'] = $origenes
                ? implode(', ', array_map(fn ($o) => $o['sede'], $origenes))
                : 'Sin stock';
            if ($faltan > 0) {
                $item['faltante'] = $faltan;
            }
            $cambios = true;
        }
        unset($item);

        if ($cambios) {
            $pedido->items = $items;
            $pedido->save();

            foreach (array_unique($sedesAfectadas) as $sedeId) {
                Cache::forget(InventarioController::claveSede($sedeId));
            }

            // La caché pública del catálogo se refresca sola (60 s).
        }
    }

    private function notificar(Pedido $pedido): void
    {
        try {
            $cliente = $pedido->cliente;
            $asesores = config('mail.asesores');

            if ($cliente && $cliente->email) {
                Mail::to($cliente->email)->send(new PedidoConfirmacionCliente($pedido));
            }
            if ($asesores) {
                Mail::to($asesores)->send(new PedidoNuevoAsesores($pedido));
            }
        } catch (\Throwable $e) {
            // Nunca debe tumbar la confirmación; el envío se registra en los logs.
            report($e);
        }
    }

    private function formatear(Pedido $p): array
    {
        return [
            'id' => $p->id,
            'numero' => $p->numero,
            'referencia' => $p->referencia ?? $p->numero,
            'fecha' => $p->created_at->toISOString(),
            'subtotal' => (int) ($p->subtotal ?? $p->total),
            'descuento' => (int) ($p->descuento ?? 0),
            'total' => (int) $p->total,
            'recompensas' => $p->recompensas ?: [],
            'factura_numero' => $p->factura_numero,
            'estado' => $p->estado,
            'payment_status' => $p->payment_status,
            'wompi_transaction_id' => $p->wompi_transaction_id,
            'metodo_pago' => $p->metodo_pago,
            'franquicia' => $p->franquicia,
            'tomado_por' => $p->tomado_por,
            'tomado_at' => $p->tomado_at ? $p->tomado_at->toISOString() : null,
            'cliente' => [
                'nombre' => optional($p->cliente)->nombre ?? '—',
                'email' => optional($p->cliente)->email,
                'telefono' => optional($p->cliente)->telefono,
                'direccion' => optional($p->cliente)->direccion,
                'ciudad' => optional($p->cliente)->ciudad,
                'documento' => optional($p->cliente)->documento,
            ],
            'items' => $p->items ?: [],
        ];
    }
}
