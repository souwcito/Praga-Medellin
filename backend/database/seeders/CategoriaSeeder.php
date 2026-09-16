<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        // tallas directas solo donde la categoría NO usa subcategorías (Jeans, Mochos, Pantalonetas)
        $categorias = [
            ['Bolsos', null],
            ['Buzos', null],
            ['Camisetas', null],
            ['Chanclas', null],
            ['Conjuntos', null],
            ['Gorras', null],
            ['Jeans', json_encode(['30', '32', '34', '36', '38'])],
            ['Mochos', json_encode(['28', '30', '32', '34', '36', '38'])],
            ['Pantalonetas', json_encode(['L', 'M', 'XL', 'XXL'])],
            ['Perfumes', null],
            ['Sudaderas', null],
            ['Tenis', null],
        ];

        foreach ($categorias as [$nombre, $tallas]) {
            DB::table('categorias')->insert([
                'nombre' => $nombre,
                'tallas' => $tallas,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}