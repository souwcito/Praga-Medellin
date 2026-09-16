<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    public function index(Request $request)
    {
        $query = Categoria::select('id', 'nombre', 'tallas', 'catalogo');
        if ($request->filled('catalogo')) {
            $query->where('catalogo', $request->catalogo);
        }
        return response()->json($query->orderBy('id')->get());
    }
}