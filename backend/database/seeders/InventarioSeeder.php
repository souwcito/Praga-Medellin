<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InventarioSeeder extends Seeder
{
    public function run(): void
    {
        $variantes = DB::table('variantes')->pluck('id');
        $sedes = [1, 2, 3, 4];

        foreach ($variantes as $i => $varianteId) {
            foreach ($sedes as $sedeId) {
                // Stock determinista; algunos en 0 en Akron (sede 2) para probar el flujo
                $stock = (($i + 1) * 3 + $sedeId * 5) % 10 + 1;
                if ($sedeId === 2 && ($i + 1) % 3 === 0) {
                    $stock = 0;
                }
                DB::table('inventarios')->insert([
                    'variante_id' => $varianteId,
                    'sede_id' => $sedeId,
                    'stock' => $stock,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}