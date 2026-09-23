<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        // [catalogo, nombre, tallas] — tallas directas solo donde la categoría NO usa subcategorías
        $categorias = [
            // ---------- CATÁLOGO HOMBRE ----------
            ['hombre', 'Bolsos', null],
            ['hombre', 'Buzos', null],
            ['hombre', 'Camisetas', null],
            ['hombre', 'Chanclas', null],
            ['hombre', 'Conjuntos', null],
            ['hombre', 'Gorras', null],
            ['hombre', 'Jeans', json_encode(['30', '32', '34', '36', '38'])],
            ['hombre', 'Mochos', json_encode(['28', '30', '32', '34', '36', '38'])],
            ['hombre', 'Pantalonetas', json_encode(['L', 'M', 'XL', '2XL'])],
            ['hombre', 'Perfumes', null],
            ['hombre', 'Sudaderas', null],
            ['hombre', 'Tenis', null],
            ['hombre', 'Relojes', null],

            // ---------- CATÁLOGO MUJER ----------
            ['mujer', 'Blusas', json_encode(['XS/S', 'S/M', 'M/L'])],
            ['mujer', 'Blusones cortos', json_encode(['S', 'M', 'L'])],
            ['mujer', 'Blusones', json_encode(['S', 'M', 'L'])],
            ['mujer', 'Bodys', json_encode(['S/M', 'M/L', 'Talla única'])],
            ['mujer', 'Bolsos', null],
            ['mujer', 'Chanclas', json_encode(['5', '6', '7', '8'])],
            ['mujer', 'Conjuntos', json_encode(['S', 'M', 'L'])],
            ['mujer', 'Sets', json_encode(['XS', 'S', 'M', 'Talla única'])],
            ['mujer', 'Faldas', json_encode(['XS', 'S', 'M', 'L', 'XL'])],
            ['mujer', 'Jeans', json_encode(['01-6', '03-8', '05-10', '07-12', '09-14', '11-16'])],
            ['mujer', 'Perfumes', null],
            ['mujer', 'Relojes', null],
            ['mujer', 'Chaquetas', json_encode(['L', 'XL'])],
            ['mujer', 'Shorts', json_encode(['XS', 'S', 'M'])],
            ['mujer', 'Vestidos', json_encode(['S', 'M', 'L'])],
            ['mujer', 'Tenis', null],
        ];

        foreach ($categorias as [$catalogo, $nombre, $tallas]) {
            DB::table('categorias')->insert([
                'catalogo' => $catalogo,
                'nombre' => $nombre,
                'tallas' => $tallas,
                'tallas_opcionales' => $nombre === 'Gorras',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}