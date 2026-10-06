<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EmpleadoSeeder extends Seeder
{
    public function run(): void
    {
        // [nombre, sede_id, rol] — sedes: 1=Praga Woman, 2=Akron Store, 3=Praga Aranjuez, 4=Praga Andalucia
        $empleados = [
            ['Michael', 3, 'cajero'],
            ['Miguel', 1, 'cajero'],
            ['Liseth', 4, 'cajero'],
            ['Bibiana', 4, 'cajero'],
            ['Sara', 2, 'cajero'],
            // Administrador que también factura en el POS (sede base: Aranjuez)
            ['Oscar', 3, 'administrador'],
        ];

        foreach ($empleados as [$nombre, $sedeId, $rol]) {
            DB::table('empleados')->insert([
                'nombre' => $nombre,
                'rol' => $rol,
                'sede_id' => $sedeId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}