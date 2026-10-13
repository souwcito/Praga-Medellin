<?php

namespace App\Http\Controllers;

use App\Mail\PedidoConfirmacionCliente;
use App\Mail\PedidoNuevoAsesores;
use App\Models\Cliente;
use App\Models\Inventario;
use App\Models\Pedido;
use App\Models\Sede;
use App\Models\Variante;
use App\Services\WompiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class PedidoController extends Controller
{
    // Historial de pedidos online con toda la información (panel de administración).
    public function index()
    {
        // El panel solo muestra pedidos ya pagados (no los abandonados).
        $pedidos = Pedido::with('cliente')
            ->whereIn('estado', ['pagado', 'enviado', 'entregado'])
            ->orderByDesc('id')
            ->get();

        $data = $pedidos->map(function ($p) {
            return $this->formatear($p);
        });

        return response()->json(['data' => $data->values()]);
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

        // Recalcula el total y arma el snapshot real de los ítems.
        $total = 0;
        $items = [];
        foreach ($data['items'] as $item) {
            $cantidad = (int) $item['cantidad'];
            // Resuelve la variante por producto_id+talla (el carrito no persiste
            // el variante_id) y valida contra el precio real del producto.
            $variante = Variante::with('producto')
                ->where('producto_id', $item['producto_id'])
                ->where('talla', $item['talla'] ?? null)
                ->first();
            if (!$variante || !$variante->producto) {
                return response()->json(['error' => 'Uno de los productos ya no está disponible.'], 400);
            }
            $precio = (int) $variante->producto->precio;
            $subtotal = $precio * $cantidad;
            $total += $subtotal;

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
                'subtotal' => $subtotal,
            ];
        }

        $numero = 'PD-' . strtoupper(uniqid());

        $pedido = Pedido::create([
            'numero' => $numero,
            'referencia' => $numero,
            'cliente_id' => $cliente->id,
            'total' => $total,
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
        $hash = $request->header('X-Event-Hash');

        if (!$wompi->webhookValido($payload, $hash)) {
            return response()->json(['error' => 'Firma inválida'], 401);
        }

        $data = json_decode($payload, true);
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
                    'metodo_pago' => $transaction['payment_method']['type'] ?? 'tarjeta',
                    'franquicia' => $transaction['payment_method']['extra']['brand'] ?? null,
                    'amount_in_cents' => (int) ($transaction['amount_in_cents'] ?? 0),
                    'currency' => $transaction['currency'] ?? 'COP',
                ]);
            }
        }

        return response()->json(['ok' => true]);
    }

    // Marca el pedido como pagado, DESCUENTA el stock (de donde haya) y notifica.
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

        $this->notificar($pedido);
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
            $this->bumpCache();
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
            'total' => (int) $p->total,
            'estado' => $p->estado,
            'payment_status' => $p->payment_status,
            'wompi_transaction_id' => $p->wompi_transaction_id,
            'metodo_pago' => $p->metodo_pago,
            'franquicia' => $p->franquicia,
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