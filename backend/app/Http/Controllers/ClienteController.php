<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\Request;

class ClienteController extends Controller
{
    // Lista clientes; con ?q= filtra por nombre o cédula (búsqueda del Plan Separe)
    public function index(Request $request)
    {
        $query = Cliente::query();

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($w) use ($q) {
                $w->where('nombre', 'like', "%{$q}%")
                    ->orWhere('documento', 'like', "%{$q}%");
            });
        }

        return response()->json($query->orderByDesc('id')->limit(30)->get());
    }

    // Crea un cliente (teléfono/cédula son opcionales pero se usan en Plan Separe)
    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string',
            'documento' => 'nullable|string|unique:clientes,documento|max:30',
            'telefono' => 'nullable|string|max:30',
            'email' => 'nullable|email',
            'direccion' => 'nullable|string',
            'ciudad' => 'nullable|string',
        ]);

        $cliente = Cliente::create([
            'nombre' => $data['nombre'],
            'documento' => $data['documento'] ?? null,
            'telefono' => $data['telefono'] ?? null,
            'email' => $data['email'] ?? null,
            'direccion' => $data['direccion'] ?? null,
            'ciudad' => $data['ciudad'] ?? 'Medellín',
        ]);

        return response()->json($cliente, 201);
    }
}