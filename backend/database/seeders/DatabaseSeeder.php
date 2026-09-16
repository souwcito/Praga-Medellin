<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Solo llamamos al Admin y a las Sedes reales
        $this->call([
            UserSeeder::class,
            SedeSeeder::class,
        ]);
    }
}