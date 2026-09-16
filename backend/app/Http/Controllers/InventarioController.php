<?php

namespace App\Http\Controllers;

use App\Models\Inventario;
use Illuminate\Http\Request;

class InventarioController extends Controller
{
    public function index(Request $request)
    {
        // 1. Capturamos el sede_id que el frontend envía en la URL (?sede_id=1)
        $sedeId = $request->query('sede_id');

        // 2. Si no nos manda la sede, le devolvemos un error 400
        if (!$sedeId) {
            return response()->json(['error' => 'El parámetro sede_id es requerido'], 400);
        }

        // 3. Buscamos el inventario de esa sede y lo unimos con la tabla productos
        $inventario = Inventario::join('productos', 'inventarios.producto_id', '=', 'productos.id')
            ->where('inventarios.sede_id', $sedeId)
            ->where('inventarios.stock', '>', 0) // Solo productos con existencias
            ->select(
                'productos.id as producto_id',
                'productos.nombre',
                'productos.precio',
                'productos.sku',
                'productos.codigo_barras',
                'productos.imagen_url',
                'inventarios.stock'
            )
            ->get();
        
        // 4. Devolvemos el array en formato JSON
        return response()->json($inventario);
    }
}