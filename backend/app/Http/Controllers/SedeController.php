<?php

namespace App\Http\Controllers;

use App\Models\Sede;
use Illuminate\Http\Request;

class SedeController extends Controller
{
    public function index()
    {
        // Traemos todas las sedes de la base de datos, seleccionando solo las 3 columnas que pidió el socio
        $sedes = Sede::select('id', 'nombre', 'direccion')->get();
        
        // Las devolvemos automáticamente en formato JSON
        return response()->json($sedes);
    }
}