<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Sede;
use Illuminate\Http\Request;

// Panel del DUEÑO (rol 'dueno'): costos por producto y valoración de la
// mercancía por sede (costo × stock) vs. valor a precio de venta.
class DuenoController extends Controller
{
    // Resumen general: totales por sede, total global y detalle por producto
    // con costo, precio web, stock por sede, valor costo/venta y margen.
    public function resumen()
    {
        $sedes = Sede::orderBy('id')->get(['id', 'nombre']);
        $productos = Producto::with(['categoria', 'subcategoria', 'variantes.inventarios'])
            ->orderBy('id')
            ->get();

        $productosData = $productos->map(function ($p) use ($sedes) {
            $stockPorSede = [];
            $unidades = 0;
            $valorCosto = 0;
            $valorVenta = 0;

            foreach ($p->variantes as $v) {
                foreach ($v->inventarios as $inv) {
                    $cant = (int) $inv->stock;
                    $unidades += $cant;
                    $valorVenta += $cant * (int) $p->precio;
                    if ($p->costo !== null) {
                        $valorCosto += $cant * (int) $p->costo;
                    }
                    $stockPorSede[(int) $inv->sede_id] = ($stockPorSede[(int) $inv->sede_id] ?? 0) + $cant;
                }
            }

            return [
                'producto_id' => $p->id,
                'nombre' => $p->nombre,
                'nombre_interno' => $p->nombre_interno,
                'categoria' => optional($p->categoria)->nombre,
                'subcategoria' => optional($p->subcategoria)->nombre,
                'catalogo' => optional($p->categoria)->catalogo,
                'precio' => (int) $p->precio,
                'costo' => $p->costo !== null ? (int) $p->costo : null,
                'unidades' => $unidades,
                'valor_costo' => $valorCosto,
                'valor_venta' => $valorVenta,
                'margen' => $valorVenta - $valorCosto,
                'stock_por_sede' => $sedes->map(fn ($s) => [
                    'sede_id' => $s->id,
                    'sede' => $s->nombre,
                    'cantidad' => $stockPorSede[(int) $s->id] ?? 0,
                ])->values(),
            ];
        });

        $sedesData = $sedes->map(function ($s) use ($productos) {
            $unidades = 0;
            $valorCosto = 0;
            $valorVenta = 0;
            $unidadesSinCosto = 0;

            foreach ($productos as $p) {
                $tieneCosto = $p->costo !== null;
                foreach ($p->variantes as $v) {
                    foreach ($v->inventarios as $inv) {
                        if ((int) $inv->sede_id !== (int) $s->id) {
                            continue;
                        }
                        $cant = (int) $inv->stock;
                        $unidades += $cant;
                        $valorVenta += $cant * (int) $p->precio;
                        if ($tieneCosto) {
                            $valorCosto += $cant * (int) $p->costo;
                        } else {
                            $unidadesSinCosto += $cant;
                        }
                    }
                }
            }

            return [
                'sede_id' => $s->id,
                'sede' => $s->nombre,
                'unidades' => $unidades,
                'valor_costo' => $valorCosto,
                'valor_venta' => $valorVenta,
                'margen' => $valorVenta - $valorCosto,
                'unidades_sin_costo' => $unidadesSinCosto,
            ];
        });

        $total = [
            'unidades' => $productosData->sum('unidades'),
            'valor_costo' => $productosData->sum('valor_costo'),
            'valor_venta' => $productosData->sum('valor_venta'),
            'margen' => $productosData->sum('margen'),
            'productos_sin_costo' => $productos->filter(fn ($p) => $p->costo === null)->count(),
        ];

        return response()->json([
            'sedes' => $sedesData->values(),
            'total' => $total,
            'productos' => $productosData->values(),
        ]);
    }

    // Edita (o limpia) el costo de un producto
    public function updateCosto(Request $request, $id)
    {
        $data = $request->validate([
            'costo' => 'nullable|integer|min:0',
        ]);

        $producto = Producto::findOrFail($id);
        $producto->costo = array_key_exists('costo', $data) && $data['costo'] !== null && $data['costo'] !== ''
            ? (int) $data['costo']
            : null;
        $producto->save();

        $this->bumpCache();

        return response()->json(['ok' => true, 'id' => (int) $producto->id, 'costo' => $producto->costo]);
    }
}