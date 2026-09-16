<?php

namespace App\Http\Controllers;

use App\Models\Empleado;
use Illuminate\Http\Request;

class EmpleadoController extends Controller
{
    public function index()
    {
        // Unimos la tabla empleados con sedes para traer el nombre de la sede
        $empleados = Empleado::join('sedes', 'empleados.sede_id', '=', 'sedes.id')
            ->select(
                'empleados.id', 
                'empleados.nombre', 
                'empleados.rol', 
                'empleados.sede_id', 
                'sedes.nombre as sede_nombre' // Renombramos la columna tal como lo pidió el frontend
            )
            ->get();
        
        return response()->json($empleados);
    }
}