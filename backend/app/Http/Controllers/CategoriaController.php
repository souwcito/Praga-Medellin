<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CategoriaController extends Controller
{
    // Convierte la categoría (con su portada) en un arreglo listo para la API y
    // para la caché (evita serializar modelos de Eloquent).
    private function mapearCategoria(Categoria $c): array
    {
        $p = $c->portada;
        $imagenes = $p
            ? array_values(array_filter(is_array($p->imagenes) ? $p->imagenes : [$p->imagen_url]))
            : [];
        $principal = $imagenes[0] ?? null;

        $thumb = null;
        if ($principal && str_ends_with($principal, '.webp')) {
            $thumb = substr($principal, 0, -5) . '-thumb.webp';
        }

        return [
            'id' => $c->id,
            'nombre' => $c->nombre,
            'tallas' => $c->tallas,
            'catalogo' => $c->catalogo,
            'tallas_opcionales' => (bool) $c->tallas_opcionales,
            'portada_producto_id' => $c->portada_producto_id,
            'portada_imagen_url' => $this->imagenUrl($principal),
            'portada_thumb_url' => $this->imagenUrl($thumb),
        ];
    }

    public function index(Request $request)
    {
        // Caché corta (60 s): /categorias se pide varias veces por visita (header,
        // catálogo y portada), así que conviene no golpear la BD en cada petición.
        // Al cambiar la portada desde el panel se invalida al instante más abajo.
        $categorias = Cache::remember('categorias', now()->addSeconds(60), function () {
            $categorias = Categoria::with('portada')
                ->select('id', 'nombre', 'tallas', 'catalogo', 'tallas_opcionales', 'portada_producto_id')
                ->orderBy('id')
                ->get();

            // Portada de respaldo: primer producto con imagen de cada categoría.
            // Se resuelve aquí (una sola consulta cacheada) para que la tienda no
            // tenga que pedir cientos de productos solo para pintar las tarjetas.
            $sinPortada = $categorias
                ->filter(fn ($c) => !$c->portada)
                ->pluck('id');

            $primeras = $sinPortada->isEmpty()
                ? collect()
                : Producto::whereIn('categoria_id', $sinPortada)
                    ->whereNotNull('imagen_url')
                    ->orderBy('id')
                    ->get(['id', 'categoria_id', 'imagen_url', 'imagenes'])
                    ->unique('categoria_id')
                    ->keyBy('categoria_id');

            return $categorias
                ->map(function ($c) use ($primeras) {
                    $data = $this->mapearCategoria($c);

                    if (!$data['portada_imagen_url'] && isset($primeras[$c->id])) {
                        $p = $primeras[$c->id];
                        $imagenes = array_values(array_filter(
                            is_array($p->imagenes) ? $p->imagenes : [$p->imagen_url]
                        ));
                        $principal = $imagenes[0] ?? null;
                        $thumb = $principal && str_ends_with($principal, '.webp')
                            ? substr($principal, 0, -5) . '-thumb.webp'
                            : null;

                        $data['portada_imagen_url'] = $this->imagenUrl($principal);
                        $data['portada_thumb_url'] = $this->imagenUrl($thumb);
                    }

                    return $data;
                })
                ->values();
        });

        if ($request->filled('catalogo')) {
            $categorias = $categorias->where('catalogo', $request->catalogo)->values();
        }

        return response()->json($categorias);
    }

    // Define (o limpia) el producto que se usa como portada de la categoría en la
    // tienda pública. Solo uno por categoría; enviar otro reemplaza al anterior.
    // producto_id = null limpia la portada.
    public function setPortada(Request $request, $id)
    {
        $data = $request->validate([
            'producto_id' => 'nullable|integer|exists:productos,id',
        ]);

        $categoria = Categoria::findOrFail($id);
        $productoId = $data['producto_id'] ?? null;

        if ($productoId !== null) {
            $producto = Producto::findOrFail($productoId);

            if ((int) $producto->categoria_id !== (int) $categoria->id) {
                return response()->json(['error' => 'El producto no pertenece a esta categoría'], 422);
            }

            $imagenes = array_filter(
                is_array($producto->imagenes) ? $producto->imagenes : [$producto->imagen_url]
            );
            if (empty($imagenes)) {
                return response()->json(['error' => 'El producto no tiene imagen para usar como portada'], 422);
            }
        }

        $categoria->portada_producto_id = $productoId;
        $categoria->save();

        // La tienda debe ver la nueva portada de inmediato.
        Cache::forget('categorias');

        return response()->json($this->mapearCategoria($categoria->fresh('portada')));
    }
}
