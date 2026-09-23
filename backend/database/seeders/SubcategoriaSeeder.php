<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SubcategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $ropaH = json_encode(['S', 'M', 'L', 'XL', '2XL']);
        $tenisH = json_encode(['7-40', '8-41', '9-42', '10-43', '11-44']);
        $chanclasH = json_encode(['6-39', '7-40', '8-41', '9-42', '10-43', '11-44']);

        $categorias = DB::table('categorias')->get()->keyBy(fn ($c) => $c->catalogo . '|' . $c->nombre);

        // [catalogo|nombreCategoria, nombreSubcategoria, tallas]
        $subs = [
            // HOMBRE
            ['hombre|Bolsos', 'Bolsos Premium 1.1', null],
            ['hombre|Bolsos', 'Bolsos Turcos', null],
            ['hombre|Buzos', 'Buzos Premium 1.1', $ropaH],
            ['hombre|Buzos', 'Buzos Turcos', $ropaH],
            ['hombre|Camisetas', 'Camisetas Originales', $ropaH],
            ['hombre|Camisetas', 'Camisetas Premium 1.1', $ropaH],
            ['hombre|Camisetas', 'Camisetas Turcas', $ropaH],
            ['hombre|Chanclas', 'Chanclas Premium 1.1', $chanclasH],
            ['hombre|Chanclas', 'Chanclas Turcas', $chanclasH],
            ['hombre|Conjuntos', 'Conjuntos Premium 1.1', $ropaH],
            ['hombre|Conjuntos', 'Conjuntos Turcos', $ropaH],
            ['hombre|Gorras', 'Gorras Originales', null],
            ['hombre|Gorras', 'Gorras Premium 1.1', null],
            ['hombre|Gorras', 'Gorras Turcas', null],
            ['hombre|Perfumes', 'Perfumes Originales', null],
            ['hombre|Perfumes', 'Perfumes Premium 1.1', null],
            ['hombre|Sudaderas', 'Sudaderas Premium 1.1', $ropaH],
            ['hombre|Tenis', 'Tenis Originales', $tenisH],
            ['hombre|Tenis', 'Tenis Premium 1.1', $tenisH],
            ['hombre|Tenis', 'Tenis Turcos', $tenisH],
            ['hombre|Relojes', 'Relojes Originales', null],
            ['hombre|Relojes', 'Relojes 1.1', null],

            // MUJER
            ['mujer|Perfumes', 'Perfumes Calidad 1.1', null],
            ['mujer|Relojes', 'Relojes Originales', null],
            ['mujer|Relojes', 'Relojes 1.1', null],
            ['mujer|Tenis', 'Tenis Calidad 1.1', json_encode(['5', '6', '7', '8'])],
            ['mujer|Tenis', 'Tenis Calidad Turca', json_encode(['5', '6', '7'])],
            ['mujer|Tenis', 'Tenis Originales', json_encode(['5', '6', '7'])],
        ];

        foreach ($subs as [$catKey, $nombre, $tallas]) {
            DB::table('subcategorias')->insert([
                'categoria_id' => $categorias[$catKey]->id,
                'nombre' => $nombre,
                'tallas' => $tallas,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}