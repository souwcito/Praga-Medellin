<?php

namespace App\Http\Controllers;

use App\Models\Categoria;

class CategoriaController extends Controller
{
    public function index()
    {
        return response()->json(
            Categoria::select('id', 'nombre', 'tallas')->get()
        );
    }
}