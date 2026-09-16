<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SubcategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $ropa = json_encode(['S', 'M', 'L', 'XL', 'XXL']);
        $tenis = json_encode(['7-40', '8-41', '9-42', '10-43', '11-44']);
        $chanclas = json_encode(['6-39', '7-40', '8-41', '9-42', '10-43', '11-44']);

        // [categoria_id, nombre, tallas]
        $subs = [
            [1, 'Bolsos Premium 1.1', null],
            [1, 'Bolsos Turcos', null],
            [2, 'Buzos Premium 1.1', $ropa],
            [2, 'Buzos Turcos', $ropa],
            [3, 'Camisetas Originales', $ropa],
            [3, 'Camisetas Premium 1.1', $ropa],
            [3, 'Camisetas Turcas', $ropa],
            [4, 'Chanclas Premium 1.1', $chanclas],
            [4, 'Chanclas Turcas', $chanclas],
            [5, 'Conjuntos Premium 1.1', $ropa],
            [5, 'Conjuntos Turcos', $ropa],
            [6, 'Gorras Originales', null],
            [6, 'Gorras Premium 1.1', null],
            [6, 'Gorras Turcas', null],
            [10, 'Perfumes Originales', null],
            [10, 'Perfumes Premium 1.1', null],
            [11, 'Sudaderas Premium 1.1', $ropa],
            [12, 'Tenis Originales', $tenis],
            [12, 'Tenis Premium 1.1', $tenis],
            [12, 'Tenis Turcos', $tenis],
        ];

        foreach ($subs as [$categoriaId, $nombre, $tallas]) {
            DB::table('subcategorias')->insert([
                'categoria_id' => $categoriaId,
                'nombre' => $nombre,
                'tallas' => $tallas,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}