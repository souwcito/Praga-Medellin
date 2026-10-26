<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    // Convierte una talla de tenis del formato USA-EUR (ej. "8-41" o "8.5/9-42")
    // a solo USA (ej. "8" o "8.5"). Si no tiene sufijo, no se toca.
    private function tallaUsa($talla): ?string
    {
        $texto = trim((string) $talla);

        if ($texto === '' || !preg_match('/[-–—]/u', $texto)) {
            return null;
        }

        if (preg_match('/^\s*(\d+(?:[.,]\d+)?)/u', $texto, $m)) {
            return str_replace(',', '.', $m[1]);
        }

        return null;
    }

    // Normaliza un JSON de tallas (categorías/subcategorías) sin duplicar.
    private function normalizarLista($json): array
    {
        $tallas = json_decode((string) $json, true);

        if (!is_array($tallas) || !$tallas) {
            return [null, false];
        }

        $nuevas = [];
        $cambio = false;

        foreach ($tallas as $talla) {
            $usa = $this->tallaUsa($talla);
            if ($usa !== null) {
                $nuevas[] = $usa;
                $cambio = true;
            } else {
                $nuevas[] = $talla;
            }
        }

        return [array_values(array_unique($nuevas)), $cambio];
    }

    public function up(): void
    {
        // Solo las categorías llamadas "Tenis" (hombre y mujer). No toca
        // chanclas, jeans, ropa ni otras categorías numéricas.
        $categoriasTenis = DB::table('categorias')
            ->whereRaw('LOWER(nombre) = ?', ['tenis'])
            ->pluck('id')
            ->all();

        if (!$categoriasTenis) {
            return;
        }

        // Tallas que usarán los productos nuevos creados desde el panel.
        $subcategorias = DB::table('subcategorias')
            ->whereIn('categoria_id', $categoriasTenis)
            ->get();

        foreach ($subcategorias as $subcategoria) {
            [$nuevas, $cambio] = $this->normalizarLista($subcategoria->tallas);

            if ($cambio) {
                DB::table('subcategorias')
                    ->where('id', $subcategoria->id)
                    ->update(['tallas' => json_encode($nuevas, JSON_UNESCAPED_UNICODE)]);
            }
        }

        // Por si la categoría Tenis tuviera tallas directas.
        $categorias = DB::table('categorias')
            ->whereIn('id', $categoriasTenis)
            ->get();

        foreach ($categorias as $categoria) {
            [$nuevas, $cambio] = $this->normalizarLista($categoria->tallas);

            if ($cambio) {
                DB::table('categorias')
                    ->where('id', $categoria->id)
                    ->update(['tallas' => json_encode($nuevas, JSON_UNESCAPED_UNICODE)]);
            }
        }

        // Variantes existentes: cambia solo la talla. No toca codigo_barras,
        // inventarios, productos ni pedidos históricos.
        $productos = DB::table('productos')
            ->whereIn('categoria_id', $categoriasTenis)
            ->pluck('id');

        foreach ($productos as $productoId) {
            $variantes = DB::table('variantes')
                ->where('producto_id', $productoId)
                ->orderBy('id')
                ->get();

            $usadas = [];
            foreach ($variantes as $variante) {
                $usadas[(string) $variante->talla] = $variante->id;
            }

            foreach ($variantes as $variante) {
                $usa = $this->tallaUsa($variante->talla);

                if ($usa === null || $usa === (string) $variante->talla) {
                    continue;
                }

                if (isset($usadas[$usa])) {
                    Log::warning('Talla de tenis no actualizada por conflicto', [
                        'producto_id' => $productoId,
                        'variante_id' => $variante->id,
                        'talla_actual' => $variante->talla,
                        'talla_usa' => $usa,
                    ]);
                    continue;
                }

                DB::table('variantes')
                    ->where('id', $variante->id)
                    ->update(['talla' => $usa]);

                unset($usadas[(string) $variante->talla]);
                $usadas[$usa] = $variante->id;
            }
        }
    }

    public function down(): void
    {
        // Normalización operativa: no se revierte automáticamente.
    }
};
