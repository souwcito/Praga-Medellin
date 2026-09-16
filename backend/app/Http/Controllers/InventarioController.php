<?php

namespace App\Http\Controllers;

use App\Models\Inventario;
use App\Models\Sede;
use App\Models\Variante;
use Illuminate\Http\Request;

class InventarioController extends Controller
{
    // Variantes con stock > 0 de una sede (para el POS)
    public function index(Request $request)
    {
        $sedeId = $request->query('sede_id');
        if (!$sedeId) {
            return response()->json(['error' => 'El parámetro sede_id es requerido'], 400);
        }

        $rows = Inventario::join('variantes', 'inventarios.variante_id', '=', 'variantes.id')
            ->join('productos', 'variantes.producto_id', '=', 'productos.id')
            ->where('inventarios.sede_id', $sedeId)
            ->where('inventarios.stock', '>', 0)
            ->select(
                'variantes.id as variante_id',
                'productos.id as producto_id',
                'productos.nombre',
                'variantes.talla',
                'productos.precio',
                'productos.sku',
                'variantes.codigo_barras',
                'productos.imagen_url',
                'inventarios.stock'
            )
            ->orderBy('productos.nombre')
            ->get()
            ->map(function ($r) {
                $r->imagen_url = $r->imagen_url ? url($r->imagen_url) : null;
                return $r;
            });

        return response()->json($rows);
    }

    // Matriz completa: cada variante con su stock por las 4 sedes
    public function completo()
    {
        $sedes = Sede::select('id', 'nombre')->orderBy('id')->get();
        $variantes = Variante::with(['producto', 'inventarios'])->get();

        $resultado = $variantes->map(function ($v) use ($sedes) {
            $stock = $sedes->map(function ($s) use ($v) {
                $reg = $v->inventarios->firstWhere('sede_id', $s->id);
                return [
                    'sede_id' => $s->id,
                    'sede' => $s->nombre,
                    'cantidad' => $reg ? (int) $reg->stock : 0,
                ];
            });
            return [
                'variante_id' => $v->id,
                'producto_id' => $v->producto_id,
                'nombre' => $v->producto->nombre,
                'talla' => $v->talla,
                'sku' => $v->producto->sku,
                'codigo_barras' => $v->codigo_barras,
                'categoria_id' => $v->producto->categoria_id,
                'subcategoria_id' => $v->producto->subcategoria_id,
                'imagen_url' => $v->producto->imagen_url ? url($v->producto->imagen_url) : null,
                'stock' => $stock->values(),
            ];
        });

        return response()->json($resultado);
    }

    // Ajuste manual: entrada (suma) o salida (resta) por variante y sede
    public function ajustes(Request $request)
    {
        $data = $request->validate([
            'variante_id' => 'required|integer',
            'sede_id' => 'required|integer',
            'tipo' => 'required|in:entrada,salida',
            'cantidad' => 'required|integer|min:1',
            'motivo' => 'nullable|string',
        ]);

        $reg = Inventario::where('variante_id', $data['variante_id'])
            ->where('sede_id', $data['sede_id'])
            ->first();

        if (!$reg) {
            return response()->json(['error' => 'Registro de inventario no encontrado'], 404);
        }

        if ($data['tipo'] === 'salida') {
            if ($reg->stock - $data['cantidad'] < 0) {
                return response()->json(['error' => 'La salida supera el stock disponible'], 422);
            }
            $reg->stock -= $data['cantidad'];
        } else {
            $reg->stock += $data['cantidad'];
        }
        $reg->save();

        return response()->json([
            'variante_id' => (int) $reg->variante_id,
            'sede_id' => (int) $reg->sede_id,
            'cantidad' => (int) $reg->stock,
            'tipo' => $data['tipo'],
            'cantidad_ajustada' => (int) $data['cantidad'],
            'motivo' => $data['motivo'] ?? null,
        ]);
    }
}