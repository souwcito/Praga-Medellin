<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use App\Models\Cliente;
use Illuminate\Http\Request;

class PedidoController extends Controller
{
    // Historial de pedidos online (con datos del cliente)
    public function index()
    {
        $pedidos = Pedido::with('cliente')->orderByDesc('id')->get();
        $data = $pedidos->map(function ($p) {
            return [
                'id' => $p->id,
                'numero' => $p->numero,
                'fecha' => $p->created_at->toISOString(),
                'cliente' => optional($p->cliente)->nombre ?? '—',
                'cliente_email' => optional($p->cliente)->email,
                'total' => (int) $p->total,
                'estado' => $p->estado,
                'items' => $p->items ?: [],
            ];
        });
        return response()->json(['data' => $data]);
    }

    // Crea/encuentra el cliente y registra el pedido (lo usará el checkout web)
    public function store(Request $request)
    {
        $data = $request->validate([
            'cliente.nombre' => 'required|string',
            'cliente.email' => 'nullable|email',
            'cliente.telefono' => 'nullable|string',
            'cliente.direccion' => 'nullable|string',
            'cliente.ciudad' => 'nullable|string',
            'total' => 'required|integer',
            'items' => 'array',
        ]);

        $cliente = Cliente::where('email', $data['cliente']['email'] ?? null)->first();
        if (!$cliente) {
            $cliente = Cliente::create($data['cliente']);
        }

        $numero = 'PD-' . strtoupper(uniqid());
        $pedido = Pedido::create([
            'numero' => $numero,
            'cliente_id' => $cliente->id,
            'total' => $data['total'],
            'estado' => 'nuevo',
            'items' => $data['items'] ?? [],
        ]);

        return response()->json($pedido->load('cliente'), 201);
    }
}