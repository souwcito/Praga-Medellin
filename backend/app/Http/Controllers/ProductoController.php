<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Variante;
use App\Models\Inventario;
use App\Models\Sede;
use App\Models\Subcategoria;
use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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

        $imagenes = array_values(array_filter(
            is_array($p->imagenes) ? $p->imagenes : [$p->imagen_url]
        ));

        $principal = $imagenes[0] ?? null;

        // Miniaturas derivadas (solo existen para imágenes subidas con el nuevo
        // flujo WebP; para imágenes antiguas se usan la principal).
        $derivada = function (?string $ruta, string $sufijo) {
            if (!$ruta || !str_ends_with($ruta, '.webp')) {
                return null;
            }

            return substr($ruta, 0, -5) . $sufijo . '.webp';
        };

        $precio = (int) $p->precio;
        $precioAntes = $p->precio_antes !== null ? (int) $p->precio_antes : null;
        $esOferta = $precioAntes !== null && $precioAntes > $precio;

        return [
            'id' => $p->id,
            'nombre' => $p->nombre,
            'nombre_interno' => $p->nombre_interno,
            'descripcion' => $p->descripcion,
            'precio' => $precio,
            'precio_antes' => $precioAntes,
            'es_oferta' => $esOferta,
            'descuento' => $esOferta ? (int) round((($precioAntes - $precio) / $precioAntes) * 100) : null,
            'sku' => $p->sku,
            'categoria_id' => $p->categoria_id,
            'categoria' => optional($p->categoria)->nombre,
            'catalogo' => optional($p->categoria)->catalogo,
            'subcategoria_id' => $p->subcategoria_id,
            'subcategoria' => optional($p->subcategoria)->nombre,
            'imagen_url' => $this->imagenUrl($principal),
            'imagen_thumb' => $this->imagenUrl($derivada($principal, '-thumb')),
            'imagen_medium' => $this->imagenUrl($derivada($principal, '-medium')),
            'imagenes' => array_map(fn ($i) => $this->imagenUrl($i), $imagenes),
            'variantes' => $variantes->values(),
            'stock_total' => (int) $variantes->sum('stock_total'),
        ];
    }

    public function index(Request $request)
    {
        // Caché de 60 s: la tienda hace polling cada 30 s, así muchos visitantes
        // comparten la misma consulta en lugar de golpear la BD por separado.
        // La versión global invalida la lista al crear/editar/borrar o vender.
        $clave = 'productos_' . md5(json_encode($request->only([
            'catalogo', 'categoria_id', 'subcategoria_id', 'q', 'en_oferta',
            'destacados', 'limit', 'offset',
        ]))) . '_' . $this->cacheVersion();

        $data = Cache::remember($clave, 60, function () use ($request) {
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
            if ($request->filled('q')) {
                $query->where('nombre', 'like', '%' . $request->q . '%');
            }
            if ($request->filled('en_oferta')) {
                $query->whereNotNull('precio_antes')->whereColumn('precio_antes', '>', 'precio');
            }

            // Home: solo un puñado de destacados (payload ligero aunque haya 500+ productos)
            if ($request->filled('destacados')) {
                $query->orderByDesc('id')->take(8);
            } elseif ($request->filled('limit')) {
                // Catálogo paginado: ?limit=40&offset=0 para cargar de a pocos
                $query->orderBy('id')->skip((int) ($request->offset ?? 0))->take((int) $request->limit);
            } else {
                $query->orderBy('id');
            }

            return $query->get()->map(fn ($p) => $this->mapear($p))->values();
        });

        return response()->json($data);
    }

    public function show($id)
    {
        $p = Producto::with(['variantes.inventarios', 'categoria', 'subcategoria'])->findOrFail($id);
        return response()->json($this->mapear($p));
    }

// Crea producto + variantes (según las tallas enviadas en el formulario; si no
    // se envían, usa las tallas de la combinación categoría+subcategoría) + inventario en las 4 sedes
    private function crearVariantes(Producto $producto, array $variantesForm, ?array $sedesAplicar = null): void
    {
        $tallas = array_column($variantesForm, 'talla');

        if (!count($tallas)) {
            $tallas = $this->tallasDe($producto->categoria_id, $producto->subcategoria_id) ?: [null];
        }

        // Evita tallas duplicadas (clave: talla o '__unica__' si es sin talla)
        $vistas = [];
        foreach ($tallas as $i => $talla) {
            $normalizada = $talla === '' || $talla === null ? null : $talla;
            $clave = $normalizada === null ? '__unica__' : (string) $normalizada;
            if (isset($vistas[$clave])) {
                continue;
            }
            $vistas[$clave] = true;
            $form = $variantesForm[$i] ?? [];
            $this->crearVarianteSola(
                $producto,
                $normalizada,
                $form['codigo_barras'] ?? null,
                (int) ($form['stock_inicial'] ?? 0),
                $sedesAplicar,
            );
        }
    }

    // Crea una única variante con su inventario en las 4 sedes. El stock inicial
    // se aplica solo a las sedes indicadas en $sedesAplicar (null = todas); en las
    // demás sedes la variante queda con stock 0.
    private function crearVarianteSola(Producto $producto, $talla, ?string $codigoBarras, int $stockInicial = 0, ?array $sedesAplicar = null): Variante
    {
        $variante = Variante::create([
            'producto_id' => $producto->id,
            'talla' => $talla === '' || $talla === null ? null : $talla,
            'codigo_barras' => !empty($codigoBarras) ? $codigoBarras : $this->siguienteBarra(),
        ]);
        $aplicarIds = $sedesAplicar !== null ? array_map('intval', $sedesAplicar) : null;
        foreach (Sede::pluck('id') as $sedeId) {
            Inventario::create([
                'variante_id' => $variante->id,
                'sede_id' => $sedeId,
                'stock' => $aplicarIds === null || in_array((int) $sedeId, $aplicarIds) ? $stockInicial : 0,
            ]);
        }

        return $variante;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string',
            'nombre_interno' => 'nullable|string',
            'precio' => 'required|integer',
            'precio_antes' => 'nullable|integer',
            'sku' => 'nullable|string',
            'descripcion' => 'nullable|string',
            'categoria_id' => 'nullable|integer',
            'subcategoria_id' => 'nullable|integer',
            'imagen_url' => 'nullable|string',
            'imagenes' => 'nullable|array',
            'imagenes.*' => 'nullable|string',
            'variantes' => 'array',
            'sedes' => 'nullable|array',
            'sedes.*' => 'integer',
        ]);

        if (!empty($data['sku']) && Producto::where('sku', $data['sku'])->exists()) {
            return response()->json(['error' => 'El SKU ya existe'], 422);
        }

        $imagenes = array_values(array_filter($request->imagenes ?? []));

        $producto = Producto::create([
            'nombre' => $data['nombre'],
            'nombre_interno' => $data['nombre_interno'] ?? null,
            'descripcion' => $data['descripcion'] ?? '',
            'precio' => $data['precio'],
            'precio_antes' => $data['precio_antes'] ?? null,
            'sku' => $data['sku'] ?? null,
            'categoria_id' => $data['categoria_id'] ?? null,
            'subcategoria_id' => $data['subcategoria_id'] ?? null,
            'imagen_url' => $imagenes[0] ?? ($data['imagen_url'] ?? null),
            'imagenes' => $imagenes ?: null,
        ]);

        $sedesAplicar = $request->filled('sedes') ? $request->sedes : null;
        $this->crearVariantes($producto, $request->variantes ?? [], $sedesAplicar);

        $this->bumpCache();

        return response()->json($this->mapear($producto->fresh(['variantes.inventarios', 'categoria', 'subcategoria'])), 201);
    }

    public function update(Request $request, $id)
    {
        $producto = Producto::findOrFail($id);

        $data = $request->validate([
            'nombre' => 'sometimes|string',
            'nombre_interno' => 'nullable|string',
            'precio' => 'sometimes|integer',
            'precio_antes' => 'nullable|integer',
            'sku' => 'nullable|string',
            'descripcion' => 'nullable|string',
            'categoria_id' => 'nullable|integer',
            'subcategoria_id' => 'nullable|integer',
            'imagen_url' => 'nullable|string',
            'imagenes' => 'nullable|array',
            'imagenes.*' => 'nullable|string',
            'variantes' => 'array',
        ]);

        if (!empty($data['sku']) && Producto::where('sku', $data['sku'])->where('id', '!=', $producto->id)->exists()) {
            return response()->json(['error' => 'El SKU ya existe en otro producto'], 422);
        }

        if (array_key_exists('imagenes', $data)) {
            $imagenes = array_values(array_filter($data['imagenes'] ?? []));
            $data['imagenes'] = $imagenes ?: null;
            $data['imagen_url'] = $imagenes[0] ?? null;
        }

        $comboCambio =
            (isset($data['categoria_id']) && (int) $data['categoria_id'] !== (int) $producto->categoria_id) ||
            (array_key_exists('subcategoria_id', $data) && (int) $data['subcategoria_id'] !== (int) $producto->subcategoria_id);

        $sedesAplicar = $request->filled('sedes') ? array_map('intval', $request->sedes) : null;

        $producto->update($data);

        if ($comboCambio) {
            // Regenera variantes (reinicia stock) según las tallas enviadas en el formulario
            foreach ($producto->variantes as $v) {
                $v->inventarios()->delete();
                $v->delete();
            }
            $this->crearVariantes($producto, $request->variantes ?? [], $sedesAplicar);
        } else {
            // Sincroniza variantes por talla: agrega las que no existen, actualiza
            // códigos de barras, aplica el stock inicial por talla (solo a las sedes
            // seleccionadas) y elimina las tallas que ya no se envían (con su
            // inventario). Permite quitar/agregar tallas sin cambiar la categoría.
            $form = $request->variantes ?? [];
            $existentes = $producto->variantes()->with('inventarios')->get()->keyBy(fn ($v) => (string) ($v->talla ?? '__unica__'));
            $nuevasTallas = [];

            foreach ($form as $item) {
                $talla = ($item['talla'] ?? '') === '' ? null : $item['talla'];
                $clave = $talla === null ? '__unica__' : (string) $talla;
                $nuevasTallas[$clave] = true;
                $barra = $item['codigo_barras'] ?? null;

                // stock_inicial: si se envía con valor, se aplica a las sedes
                // seleccionadas; si llega vacío no se toca el stock actual de la talla.
                $stockInicial = null;
                if (array_key_exists('stock_inicial', $item) && $item['stock_inicial'] !== null && $item['stock_inicial'] !== '') {
                    $stockInicial = (int) $item['stock_inicial'];
                }

                if ($existentes->has($clave)) {
                    $v = $existentes[$clave];
                    if (!empty($barra) && $v->codigo_barras !== $barra) {
                        $v->update(['codigo_barras' => $barra]);
                    }
                    if ($stockInicial !== null) {
                        foreach ($v->inventarios as $inv) {
                            $aplica = $sedesAplicar === null || in_array((int) $inv->sede_id, $sedesAplicar);
                            if ($aplica && (int) $inv->stock !== $stockInicial) {
                                $inv->stock = $stockInicial;
                                $inv->save();
                            }
                        }
                    }
                } else {
                    $this->crearVarianteSola($producto, $talla, $barra, $stockInicial ?? 0, $sedesAplicar);
                }
            }

            foreach ($existentes as $clave => $v) {
                if (!isset($nuevasTallas[$clave])) {
                    $v->inventarios()->delete();
                    $v->delete();
                }
            }
        }

        // Si cambió stock, se invalida la caché del inventario por sede (POS/tienda)
        foreach (Sede::pluck('id') as $sedeId) {
            Cache::forget(InventarioController::claveSede((int) $sedeId));
        }

        $this->bumpCache();

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

        $this->bumpCache();

        return response()->json(['ok' => true, 'id' => (int) $id]);
    }
}