<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VarianteSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = DB::table('categorias')->get()->keyBy('id');
        $subcategorias = DB::table('subcategorias')->get()->keyBy('id');
        $productos = DB::table('productos')->get();

        $barra = 770100000000;

        foreach ($productos as $p) {
            // Tallas de la combinación: subcategoría primero, si no categoría
            $tallas = null;
            if ($p->subcategoria_id && isset($subcategorias[$p->subcategoria_id])) {
                $tallas = json_decode($subcategorias[$p->subcategoria_id]->tallas ?? 'null', true);
            }
            if ($tallas === null && isset($categorias[$p->categoria_id])) {
                $tallas = json_decode($categorias[$p->categoria_id]->tallas ?? 'null', true);
            }
            $tallas = $tallas ?: [];

            $lista = count($tallas) ? $tallas : [null];
            foreach ($lista as $talla) {
                $barra++;
                DB::table('variantes')->insert([
                    'producto_id' => $p->id,
                    'talla' => $talla,
                    'codigo_barras' => (string) $barra,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}