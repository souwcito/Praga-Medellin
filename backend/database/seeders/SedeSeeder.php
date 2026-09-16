<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SedeSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('sedes')->insert([
            [
                'nombre' => 'Praga Woman',
                'direccion' => 'Calle 92B # 66 A 47, Castilla',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Akron Store',
                'direccion' => 'Cra 68 # 93-24, Castilla',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Praga Aranjuez',
                'direccion' => 'Cra 49 A # 92-24, Aranjuez',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Praga Aranjuez',
                'direccion' => 'Cra 49 A # 92-24, Aranjuez',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Praga Andalucía',
                'direccion' => 'Calle 107 # 47-27, Andalucía',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}