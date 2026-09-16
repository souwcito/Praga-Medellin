<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Variante;
use App\Models\Inventario;
use App\Models\Sede;
use App\Models\Subcategoria;
use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductoController extends Controller
{
    // Tallas válidas para una combinación categoría + subcategoría
    private function tallasDe($categoriaId, $subcategoriaId): array
    {
        if ($subcategoriaId) {
            $sub = Subcategoria::find($subcategoriaId);
            if ($sub && !empty($sub->tallas)) {
                return $sub->tallas;
            }
        }
        $cat = Categoria::find($categoriaId);
        return $cat && !empty($cat->tallas) ? $cat->tallas : [];
    }

    private function siguienteBarra(): string
    {
        $max = Variante::max(DB::raw('CAST(codigo_barras AS INTEGER)'));
        return (string) (($max ?: 770100000000) + 1);
    }

    private function mapear(Producto $p): array
    {
        $variantes = $p->variantes->map(function ($v) {
            $stock = (int) $v->inventarios->sum('stock');
            return [
                'id' => $v->id,
                'talla' => $v->talla,
                'codigo_barras' => $v->codigo_barras,
                'stock_total' => $stock,
                // 'stock' = disponibilidad total (suma de sedes) para la tienda pública
                'stock' => $stock,
            ];
        });

        return [
            'id' => $p->id,
            'nombre' => $p->nombre,
            'descripcion' => $p->descripcion,
            'precio' => (int) $p->precio,
            'sku' => $p->sku,
            'categoria_id' => $p->categoria_id,
            'categoria' => optional($p->categoria)->nombre,
            'catalogo' => optional($p->categoria)->catalogo,
            'subcategoria_id' => $p->subcategoria_id,
            'subcategoria' => optional($p->subcategoria)->nombre,
            'imagen_url' => $p->imagen_url ? url($p->imagen_url) : null,
            'variantes' => $variantes->values(),
            'stock_total' => (int) $variantes->sum('stock_total'),
        ];
    }

    public function index(Request $request)
    {
        $query = Producto::with(['variantes.inventarios', 'categoria', 'subcategoria']);
        if ($request->filled('catalogo')) {
            $query->whereHas('categoria', fn ($q) => $q->where('catalogo', $request->catalogo));
        }
        if ($request->filled('categoria_id')) {
            $query->where('categoria_id', $request->categoria_id);
        }
        if ($request->filled('subcategoria_id')) {
            $query->where('subcategoria_id', $request->subcategoria_id);
        }
        return response()->json($query->orderBy('id')->get()->map(fn ($p) => $this->mapear($p)));
    }

    public function show($id)
    {
        $p = Producto::with(['variantes.inventarios', 'categoria', 'subcategoria'])->findOrFail($id);
        return response()->json($this->mapear($p));
    }

    // Crea producto + variantes (según tallas de la combinación) + inventario en las 4 sedes
    private function crearVariantes(Producto $producto, array $variantesForm): void
    {
        $tallas = $this->tallasDe($producto->categoria_id, $producto->subcategoria_id);
        $lista = count($tallas) ? $tallas : [null];
        $sedes = Sede::pluck('id');

        foreach ($lista as $i => $talla) {
            $form = $variantesForm[$i] ?? [];
            $variante = Variante::create([
                'producto_id' => $producto->id,
                'talla' => $talla,
                'codigo_barras' => !empty($form['codigo_barras']) ? $form['codigo_barras'] : $this->siguienteBarra(),
            ]);
            foreach ($sedes as $sedeId) {
                Inventario::create([
                    'variante_id' => $variante->id,
                    'sede_id' => $sedeId,
                    'stock' => (int) ($form['stock_inicial'] ?? 0),
                ]);
            }
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string',
            'precio' => 'required|integer',
            'sku' => 'nullable|string',
            'descripcion' => 'nullable|string',
            'categoria_id' => 'nullable|integer',
            'subcategoria_id' => 'nullable|integer',
            'imagen_url' => 'nullable|string',
            'variantes' => 'array',
        ]);

        if (!empty($data['sku']) && Producto::where('sku', $data['sku'])->exists()) {
            return response()->json(['error' => 'El SKU ya existe'], 422);
        }

        $producto = Producto::create([
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? '',
            'precio' => $data['precio'],
            'sku' => $data['sku'] ?? null,
            'categoria_id' => $data['categoria_id'] ?? null,
            'subcategoria_id' => $data['subcategoria_id'] ?? null,
            'imagen_url' => $data['imagen_url'] ?? null,
        ]);

        $this->crearVariantes($producto, $request->variantes ?? []);

        return response()->json($this->mapear($producto->fresh(['variantes.inventarios', 'categoria', 'subcategoria'])), 201);
    }

    public function update(Request $request, $id)
    {
        $producto = Producto::findOrFail($id);

        $data = $request->validate([
            'nombre' => 'sometimes|string',
            'precio' => 'sometimes|integer',
            'sku' => 'nullable|string',
            'descripcion' => 'nullable|string',
            'categoria_id' => 'nullable|integer',
            'subcategoria_id' => 'nullable|integer',
            'imagen_url' => 'nullable|string',
            'variantes' => 'array',
        ]);

        if (!empty($data['sku']) && Producto::where('sku', $data['sku'])->where('id', '!=', $producto->id)->exists()) {
            return response()->json(['error' => 'El SKU ya existe en otro producto'], 422);
        }

        $comboCambio =
            (isset($data['categoria_id']) && (int) $data['categoria_id'] !== (int) $producto->categoria_id) ||
            (array_key_exists('subcategoria_id', $data) && (int) $data['subcategoria_id'] !== (int) $producto->subcategoria_id);

        $producto->update($data);

        if ($comboCambio) {
            // Regenera variantes (reinicia stock) según las nuevas tallas
            foreach ($producto->variantes as $v) {
                $v->inventarios()->delete();
                $v->delete();
            }
            $this->crearVariantes($producto, []);
        } else {
            // Actualiza códigos de barras existentes
            $form = $request->variantes ?? [];
            $existentes = $producto->variantes()->orderBy('id')->get();
            foreach ($existentes as $i => $v) {
                if (!empty($form[$i]['codigo_barras'])) {
                    $v->update(['codigo_barras' => $form[$i]['codigo_barras']]);
                }
            }
        }

        return response()->json($this->mapear($producto->fresh(['variantes.inventarios', 'categoria', 'subcategoria'])));
    }

    public function destroy($id)
    {
        $producto = Producto::findOrFail($id);
        foreach ($producto->variantes as $v) {
            $v->inventarios()->delete();
        }
        $producto->variantes()->delete();
        $producto->delete();
        return response()->json(['ok' => true, 'id' => (int) $id]);
    }
}