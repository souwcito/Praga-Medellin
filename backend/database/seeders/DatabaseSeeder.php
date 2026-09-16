<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            SedeSeeder::class,
            CategoriaSeeder::class,
            SubcategoriaSeeder::class,
            ProductoSeeder::class,
            VarianteSeeder::class,
            EmpleadoSeeder::class,
            InventarioSeeder::class,
        ]);
    }
}