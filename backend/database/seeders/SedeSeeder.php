<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SedeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('sedes')->insert([
            [
                'nombre' => 'Praga Woman',
                'direccion' => 'Dirección pendiente', 
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Akron Store',
                'direccion' => 'Dirección pendiente',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Praga Aranjuez',
                'direccion' => 'Aranjuez',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Praga Andalucía',
                'direccion' => 'Andalucía',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
    }
}
