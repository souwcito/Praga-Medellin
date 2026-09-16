<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductoSeeder extends Seeder
{
    public function run(): void
    {
        // [nombre, precio, sku, codigo_barras, categoria_id, subcategoria_id, imagen_url]
        $productos = [
            ['Buzo Premium 1.1 Negro', 159000, 'BUZ-P11-01', '770100000001', 2, 3, '/images/products/chaqueta.svg'],
            ['Buzo Turco Gris', 129000, 'BUZ-TUR-01', '770100000002', 2, 4, '/images/products/chaqueta.svg'],
            ['Camiseta Original Negra', 85000, 'CAM-ORI-01', '770100000003', 3, 5, '/images/products/camiseta.svg'],
            ['Camiseta Premium 1.1 Boxeada', 99000, 'CAM-P11-01', '770100000004', 3, 6, '/images/products/camiseta.svg'],
            ['Camiseta Turca Básica', 75000, 'CAM-TUR-01', '770100000005', 3, 7, '/images/products/camiseta.svg'],
            ['Chancla Premium 1.1', 45000, 'CHA-P11-01', '770100000006', 4, 8, '/images/products/accesorio.svg'],
            ['Conjunto Premium 1.1', 219000, 'CON-P11-01', '770100000007', 5, 10, '/images/products/chaqueta.svg'],
            ['Gorra Original Negra', 60000, 'GOR-ORI-01', '770100000008', 6, 12, '/images/products/accesorio.svg'],
            ['Jean Cargo Negro', 139000, 'JEA-CAR-01', '770100000009', 7, null, '/images/products/pantalon.svg'],
            ['Mocho Pata de Gallo', 149000, 'MOC-PDG-01', '770100000010', 8, null, '/images/products/pantalon.svg'],
            ['Pantaloneta Deportiva', 95000, 'PAN-DEP-01', '770100000011', 9, null, '/images/products/pantalon.svg'],
            ['Perfume Original 1.1', 159000, 'PER-ORI-01', '770100000012', 10, 15, '/images/products/accesorio.svg'],
            ['Sudadera Premium 1.1', 169000, 'SUD-P11-01', '770100000013', 11, 17, '/images/products/chaqueta.svg'],
            ['Tenis Original Blanco', 189000, 'TEN-ORI-01', '770100000014', 12, 18, '/images/products/chaqueta.svg'],
            ['Bolso Premium 1.1', 120000, 'BOL-P11-01', '770100000015', 1, 1, '/images/products/accesorio.svg'],
        ];

        foreach ($productos as [$nombre, $precio, $sku, $codigo, $cat, $sub, $img]) {
            DB::table('productos')->insert([
                'nombre' => $nombre,
                'descripcion' => '',
                'precio' => $precio,
                'sku' => $sku,
                'codigo_barras' => $codigo,
                'categoria_id' => $cat,
                'subcategoria_id' => $sub,
                'imagen_url' => $img,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}