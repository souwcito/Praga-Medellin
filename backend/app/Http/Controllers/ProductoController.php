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
use Illuminate\Support\Str;

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

    // Normaliza una talla numérica de calzado (tenis/chanclas):
    //   "7-8/43-44" -> "7-8"; "8.5/9-42" -> "8.5/9"; "6-39" -> "6".
    private function tallaCalzadoUsa(string $talla): string
    {
        $texto = trim($talla);
        if ($texto === '') {
            return '';
        }

        if (str_contains($texto, '/')) {
            $partes = explode('/', $texto);
            $antes = trim(implode('/', array_slice($partes, 0, -1)));
            $ultima = trim((string) end($partes));

            if (preg_match_all('/\d+(?:[.,]\d+)?/u', $ultima, $mm) && $mm[0]) {
                $numeros = array_map(
                    fn ($n) => (float) str_replace(',', '.', $n),
                    $mm[0]
                );
                $primerEur = $numeros[0];
                $ultimoEur = $numeros[count($numeros) - 1];

                // El bloque anterior ya es un rango USA y el último es EUR.
                if (str_contains($antes, '-') && $ultimoEur >= 30) {
                    return str_replace(',', '.', $antes);
                }
                // El último bloque empieza en EUR.
                if ($primerEur >= 30) {
                    return str_replace(',', '.', $antes);
                }
            }
        }

        // Formato "USA-EUR" al final: "8-41" -> "8"; "8.5/9-42" -> "8.5/9".
        if (preg_match('/^(.+?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*$/u', $texto, $m)) {
            $segundo = (float) str_replace(',', '.', $m[2]);
            if ($segundo >= 30) {
                return str_replace(',', '.', trim($m[1]));
            }
        }

        return str_replace(',', '.', $texto);
    }

    private function tallaUsa(string $talla): string
    {
        return $this->tallaCalzadoUsa($talla);
    }

    private function tallaChanclas(string $talla): string
    {
        return $this->tallaCalzadoUsa($talla);
    }

    private function esTenisProducto(array $p): bool
    {
        $nombre = mb_strtolower(trim(($p['categoria'] ?? '') . ' ' . ($p['subcategoria'] ?? '')));
        return str_contains($nombre, 'tenis')
            || in_array((int) ($p['categoria_id'] ?? 0), [12, 28], true);
    }

    private function esChanclasProducto(array $p): bool
    {
        $nombre = mb_strtolower(trim(($p['categoria'] ?? '') . ' ' . ($p['subcategoria'] ?? '')));
        return str_contains($nombre, 'chancla')
            || in_array((int) ($p['categoria_id'] ?? 0), [4, 18], true);
    }

    private function normalizarTallaProducto(string $talla, array $p): string
    {
        if ($this->esTenisProducto($p)) {
            return $this->tallaUsa($talla);
        }
        if ($this->esChanclasProducto($p)) {
            return $this->tallaChanclas($talla);
        }
        return trim($talla);
    }

    // Convierte una talla normalizada en intervalos numéricos. "6-7/8-9" son
    // dos intervalos; "7" es [7, 7]. Así "7" coincide con "6-7" y "7-8".
    private function intervalosTalla(string $talla): array
    {
        $intervalos = [];
        foreach (explode('/', $talla) as $bloque) {
            if (!preg_match_all('/\d+(?:[.,]\d+)?/u', $bloque, $m)) {
                continue;
            }
            $numeros = array_map(
                fn ($n) => (float) str_replace(',', '.', $n),
                $m[0]
            );
            if (!$numeros) {
                continue;
            }
            $a = $numeros[0];
            $b = $numeros[1] ?? $a;
            $intervalos[] = [min($a, $b), max($a, $b)];
        }
        return $intervalos;
    }

    private function tallasCompatibles(string $a, string $b): bool
    {
        foreach ($this->intervalosTalla($a) as [$a1, $a2]) {
            foreach ($this->intervalosTalla($b) as [$b1, $b2]) {
                if ($a1 <= $b2 && $b1 <= $a2) {
                    return true;
                }
            }
        }
        return false;
    }

    private function tallaCoincideProducto($tallaVariante, string $buscada, array $p): bool
    {
        $variante = mb_strtolower($this->normalizarTallaProducto((string) $tallaVariante, $p));
        $filtro = mb_strtolower($this->normalizarTallaProducto($buscada, $p));

        if ($variante === '' || $filtro === '') {
            return false;
        }
        if ($variante === $filtro) {
            return true;
        }
        if ($this->esTenisProducto($p) || $this->esChanclasProducto($p)) {
            return $this->tallasCompatibles($variante, $filtro);
        }
        return false;
    }

    private function siguienteBarra(): string
    {
        $max = Variante::max(DB::raw('CAST(codigo_barras AS INTEGER)'));
        return (string) (($max ?: 770100000000) + 1);
    }

    // Normaliza una talla para usarla dentro del código de barras: sin tildes,
    // sin espacios repetidos y conservando S/M o L/XL. Devuelve '' para las
    // tallas únicas (gorras, unitalla) porque su código es solo el SKU.
    private function tallaParaCodigo($talla): string
    {
        $texto = trim((string) $talla);
        if ($texto === '') {
            return '';
        }

        $texto = Str::ascii($texto);
        $texto = preg_replace('/\s*\/\s*/', '/', $texto) ?? '';
        $texto = preg_replace('/[^A-Za-z0-9._\/-]+/', '-', $texto) ?? '';
        $texto = preg_replace('/-{2,}/', '-', $texto) ?? '';
        $texto = trim($texto, '-. ');

        $plano = strtolower(preg_replace('/[-_]+/', ' ', $texto) ?? '');
        $plano = trim(preg_replace('/\s+/', ' ', $plano) ?? '');
        $unicas = ['unica', 'unico', 'unitalla', 'talla unica', 'talla unico', 'talla unitalla'];

        return in_array($plano, $unicas, true) ? '' : $texto;
    }

    // Código de barras del producto: el mismo SKU-TALLA que genera el panel y
    // que se imprime en los stickers. Sin SKU cae al generador numérico.
    private function barraParaProducto(Producto $producto, $talla): string
    {
        $sku = trim((string) $producto->sku);
        if ($sku === '') {
            return $this->siguienteBarra();
        }

        $tallaCodigo = $this->tallaParaCodigo($talla);
        return $tallaCodigo === '' ? $sku : $sku . '-' . $tallaCodigo;
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

    // Lista completa de productos mapeados, cacheada con stale-while-revalidate.
    // La usan tanto el listado como el detalle para no repetir consultas pesadas.
    private function productosCache()
    {
        $clave = 'productos_todos_' . $this->cacheVersion();

        return Cache::flexible($clave, [60, 3600], function () {
            return Producto::with(['variantes.inventarios', 'categoria', 'subcategoria'])
                ->orderBy('id')
                ->get()
                ->map(fn ($p) => $this->mapear($p))
                ->values();
        });
    }

    public function index(Request $request)
    {
        // Una sola lista cacheada con TODOS los productos (~500). Los filtros se
        // aplican en memoria: antes cada combinación de categoría/talla/página
        // ejecutaba su propia consulta pesada y, con el hosting lento, algunas
        // tardaban 8-15 s y terminaban en error 500.
        // Cache::flexible sirve la copia anterior mientras refresca en segundo
        // plano, así ningún cliente espera la consulta completa.
        $items = collect($this->productosCache());

        if ($request->filled('catalogo')) {
            $items = $items->where('catalogo', $request->catalogo);
        }
        if ($request->filled('categoria_id')) {
            $items = $items->where('categoria_id', (int) $request->categoria_id);
        }
        if ($request->filled('subcategoria_id')) {
            $items = $items->where('subcategoria_id', (int) $request->subcategoria_id);
        }
        if ($request->filled('q')) {
            $busqueda = mb_strtolower(trim((string) $request->q));
            $items = $items->filter(
                fn ($p) => str_contains(mb_strtolower((string) $p['nombre']), $busqueda)
            );
        }
        if ($request->filled('en_oferta')) {
            $items = $items->where('es_oferta', true);
        }
        if ($request->filled('talla')) {
            $talla = (string) $request->talla;
            $items = $items->filter(function ($p) use ($talla) {
                return collect($p['variantes'])->contains(
                    fn ($v) => (int) ($v['stock'] ?? 0) > 0
                        && $this->tallaCoincideProducto($v['talla'] ?? '', $talla, $p)
                );
            });
        }

        // Home: solo un puñado de destacados (payload ligero aunque haya 500+ productos)
        if ($request->filled('destacados')) {
            $items = $items->sortByDesc('id')->take(8);
        } elseif ($request->filled('limit')) {
            // Catálogo paginado: ?limit=40&offset=0 para cargar de a pocos
            $items = $items->slice((int) ($request->offset ?? 0), (int) $request->limit);
        }

        return response()->json($items->values());
    }

    public function show($id)
    {
        $producto = collect($this->productosCache())->firstWhere('id', (int) $id);

        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        return response()->json($producto);
    }

    // Stock por talla y sede para imprimir stickers. Se consulta solo al abrir
    // el modal de etiquetas para no cargar la matriz completa del inventario.
    public function stock($id)
    {
        $producto = Producto::with(['variantes.inventarios'])->find($id);

        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        $sedes = $this->sedesFisicas();

        return response()->json([
            'producto' => [
                'id' => $producto->id,
                'nombre' => $producto->nombre,
                'precio' => (int) $producto->precio,
                'sku' => $producto->sku,
            ],
            'sedes' => $sedes,
            'variantes' => $this->stockVariantes($producto, $sedes),
        ]);
    }

    // Todos los productos de una categoría con su stock por sede, en el mismo
    // orden en que la tienda pública los muestra (id ascendente).
    public function stockCategoria(Request $request)
    {
        $data = $request->validate([
            'categoria_id' => 'required|integer',
            'subcategoria_id' => 'nullable|integer',
        ]);

        $categoria = Categoria::find($data['categoria_id']);
        if (!$categoria) {
            return response()->json(['message' => 'Categoría no encontrada'], 404);
        }

        $sedes = $this->sedesFisicas();
        $query = Producto::with(['variantes.inventarios'])
            ->where('categoria_id', $categoria->id)
            ->orderBy('id');

        if (!empty($data['subcategoria_id'])) {
            $query->where('subcategoria_id', $data['subcategoria_id']);
        }

        $productos = $query->get()->map(function ($producto) use ($sedes) {
            $principal = $producto->imagen_url;
            $thumb = $principal && str_ends_with($principal, '.webp')
                ? substr($principal, 0, -5) . '-thumb.webp'
                : $principal;

            return [
                'id' => $producto->id,
                'nombre' => $producto->nombre,
                'precio' => (int) $producto->precio,
                'sku' => $producto->sku,
                'imagen_url' => $this->imagenUrl($principal),
                'imagen_thumb' => $this->imagenUrl($thumb),
                'variantes' => $this->stockVariantes($producto, $sedes),
            ];
        });

        return response()->json([
            'categoria' => [
                'id' => $categoria->id,
                'nombre' => $categoria->nombre,
            ],
            'sedes' => $sedes,
            'productos' => $productos->values(),
        ]);
    }

    private function sedesFisicas()
    {
        return Sede::select('id', 'nombre')
            ->where('nombre', '!=', 'Online')
            ->orderBy('id')
            ->get();
    }

    private function stockVariantes(Producto $producto, $sedes)
    {
        return $producto->variantes->map(function ($variante) use ($sedes) {
            return [
                'id' => $variante->id,
                'talla' => $variante->talla,
                'codigo_barras' => $variante->codigo_barras,
                'stock' => $sedes->map(function ($sede) use ($variante) {
                    $registro = $variante->inventarios->firstWhere('sede_id', $sede->id);

                    return [
                        'sede_id' => $sede->id,
                        'sede' => $sede->nombre,
                        'cantidad' => $registro ? (int) $registro->stock : 0,
                    ];
                })->values(),
            ];
        })->values();
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
        $tallaNormalizada = $talla === '' || $talla === null ? null : $talla;

        // Si no llega un código de barras, se genera como SKU-TALLA (p. ej.
        // CAM0624353-M, CAM0624353-30) o SKU si es talla única. Sin SKU, cae al
        // generador numérico.
        $barra = $codigoBarras;
        if (empty($barra)) {
            $barra = $this->barraParaProducto($producto, $tallaNormalizada);
        }

        $variante = Variante::create([
            'producto_id' => $producto->id,
            'talla' => $tallaNormalizada,
            'codigo_barras' => $barra,
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
            'variantes.*.id' => 'nullable|integer',
            'variantes.*.talla' => 'nullable|string',
            'variantes.*.codigo_barras' => 'nullable|string',
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
            $existentesPorBarra = $existentes
                ->filter(fn ($v) => trim((string) $v->codigo_barras) !== '')
                ->keyBy(fn ($v) => trim((string) $v->codigo_barras));

            // Tallas que quedarán después de guardar. Se calcula antes para
            // detectar renombrados de talla (6-7/8-9 -> 6-7).
            $nuevasTallas = [];
            foreach ($form as $item) {
                $t = ($item['talla'] ?? '') === '' ? null : $item['talla'];
                $nuevasTallas[$t === null ? '__unica__' : (string) $t] = true;
            }

            $renombrados = [];

            foreach ($form as $item) {
                $talla = ($item['talla'] ?? '') === '' ? null : $item['talla'];
                $clave = $talla === null ? '__unica__' : (string) $talla;
                $barra = trim((string) ($item['codigo_barras'] ?? ''));

                // stock_inicial: si se envía con valor, se SUMA al stock actual
                // de las sedes seleccionadas; si llega vacío no se toca.
                $stockInicial = null;
                if (array_key_exists('stock_inicial', $item) && $item['stock_inicial'] !== null && $item['stock_inicial'] !== '') {
                    $stockInicial = (int) $item['stock_inicial'];
                }

                $sumarStock = function ($v) use ($stockInicial, $sedesAplicar) {
                    if ($stockInicial === null || $stockInicial === 0) {
                        return;
                    }
                    foreach ($v->inventarios as $inv) {
                        $aplica = $sedesAplicar === null || in_array((int) $inv->sede_id, $sedesAplicar);
                        if ($aplica) {
                            $inv->stock = (int) $inv->stock + $stockInicial;
                            $inv->save();
                        }
                    }
                };

                // El panel envía el id de la variante al editar. Si la talla
                // cambió (por ejemplo 6-7/8-9 -> 6-7), se actualiza esa misma
                // fila y NO se crea otra: así no choca el código de barras
                // UNIQUE y se conserva el stock.
                $varianteId = (int) ($item['id'] ?? 0);
                $vPorId = $varianteId > 0
                    ? $existentes->firstWhere('id', $varianteId)
                    : null;

                if ($vPorId) {
                    $vPorId->talla = $talla;

                    if ($barra !== '' && $vPorId->codigo_barras !== $barra) {
                        $dueno = $existentesPorBarra->get($barra);
                        if (!$dueno || (int) $dueno->id === (int) $vPorId->id) {
                            $vPorId->codigo_barras = $barra;
                            $existentesPorBarra->put($barra, $vPorId);
                        }
                    }

                    $vPorId->save();
                    $renombrados[(int) $vPorId->id] = true;
                    $sumarStock($vPorId);
                    continue;
                }

                if ($existentes->has($clave)) {
                    $v = $existentes[$clave];

                    // No pisar el código de barras de otra variante: si ya está
                    // usado, se conserva el actual para evitar el error 500 por
                    // la restricción UNIQUE de codigo_barras.
                    if ($barra !== '' && $v->codigo_barras !== $barra) {
                        $dueno = $existentesPorBarra->get($barra);
                        if (!$dueno || (int) $dueno->id === (int) $v->id) {
                            $v->update(['codigo_barras' => $barra]);
                            $existentesPorBarra->put($barra, $v);
                        }
                    }

                    $sumarStock($v);
                    continue;
                }

                // Si la talla cambió pero el código de barras es el mismo, se
                // actualiza la variante existente en vez de crear otra. Así se
                // conserva el stock, el historial y no choca el UNIQUE.
                $renombrar = $barra !== '' ? $existentesPorBarra->get($barra) : null;
                if ($renombrar) {
                    $claveAnterior = $renombrar->talla === null ? '__unica__' : (string) $renombrar->talla;
                    if (!isset($nuevasTallas[$claveAnterior])) {
                        $renombrar->talla = $talla;
                        $renombrar->save();
                        $renombrados[(int) $renombrar->id] = true;
                        $sumarStock($renombrar);
                        continue;
                    }

                    // El código ya pertenece a otra variante que se queda:
                    // se genera uno nuevo para no violar el UNIQUE.
                    $barra = '';
                }

                $this->crearVarianteSola($producto, $talla, $barra ?: null, $stockInicial ?? 0, $sedesAplicar);
            }

            foreach ($existentes as $clave => $v) {
                if (isset($nuevasTallas[$clave]) || isset($renombrados[(int) $v->id])) {
                    continue;
                }
                $v->inventarios()->delete();
                $v->delete();
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