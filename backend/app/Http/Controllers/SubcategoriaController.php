<?php

namespace App\Http\Controllers;

use App\Models\Subcategoria;
use Illuminate\Support\Facades\Cache;

class SubcategoriaController extends Controller
{
    public function index()
    {
        return response()->json(
            Cache::remember('subcategorias', now()->addDay(), function () {
                return Subcategoria::select('id', 'categoria_id', 'nombre', 'tallas')->get();
            })
        );
    }
}