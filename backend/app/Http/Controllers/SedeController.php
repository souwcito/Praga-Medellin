<?php

namespace App\Http\Controllers;

use App\Models\Sede;
use Illuminate\Http\Request;

class SedeController extends Controller
{
    public function index()
    {
        // Sedes físicas. Se excluye la sede virtual 'Online' (atribución de ventas
        // web) para que no aparezca en los selectores de sede del POS/panel.
        $sedes = Sede::select('id', 'nombre', 'direccion')
            ->where('nombre', '!=', 'Online')
            ->get();

        // Las devolvemos automáticamente en formato JSON
        return response()->json($sedes);
    }
}