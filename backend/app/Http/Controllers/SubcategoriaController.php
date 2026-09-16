<?php

namespace App\Http\Controllers;

use App\Models\Subcategoria;

class SubcategoriaController extends Controller
{
    public function index()
    {
        return response()->json(
            Subcategoria::select('id', 'categoria_id', 'nombre', 'tallas')->get()
        );
    }
}