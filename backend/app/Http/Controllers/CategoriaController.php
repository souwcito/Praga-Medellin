<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CategoriaController extends Controller
{
    public function index(Request $request)
    {
        // Caché de archivo: las categorías cambian poco. Con 4 sedes + polling
        // evita golpear la BD constantemente.
        $categorias = Cache::remember('categorias', now()->addDay(), function () {
            return Categoria::select('id', 'nombre', 'tallas', 'catalogo', 'tallas_opcionales')
                ->orderBy('id')
                ->get();
        });

        if ($request->filled('catalogo')) {
            $categorias = $categorias->where('catalogo', $request->catalogo)->values();
        }

        return response()->json($categorias);
    }
}