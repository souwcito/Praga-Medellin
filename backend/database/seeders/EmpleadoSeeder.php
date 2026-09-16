<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EmpleadoSeeder extends Seeder
{
    public function run(): void
    {
        // [nombre, sede_id] — sedes: 1=Praga Woman, 2=Akron Store, 3=Praga Aranjuez, 4=Praga Andalucía
        $empleados = [
            ['Michael', 3],
            ['María Fernanda', 1],
            ['Liseth', 4],
            ['Bibiana', 4],
            ['Sara', 2],
        ];

        foreach ($empleados as [$nombre, $sedeId]) {
            DB::table('empleados')->insert([
                'nombre' => $nombre,
                'rol' => 'cajero',
                'sede_id' => $sedeId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}