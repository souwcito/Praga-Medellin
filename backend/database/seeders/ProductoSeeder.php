<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductoSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = DB::table('categorias')->get()->keyBy(fn ($c) => $c->catalogo . '|' . $c->nombre);
        $subcategorias = DB::table('subcategorias')->get()->keyBy(fn ($s) => $s->categoria_id . '|' . $s->nombre);

        // [catalogo|Categoria, subCategoria (o null), nombre, precio, sku, codigo_barras, imagen]
        $productos = [
            ['hombre|Buzos', 'Buzos Premium 1.1', 'Buzo Premium 1.1 Negro', 159000, 'BUZ-P11-01', '770100000001', '/images/products/chaqueta.svg'],
            ['hombre|Buzos', 'Buzos Turcos', 'Buzo Turco Gris', 129000, 'BUZ-TUR-01', '770100000002', '/images/products/chaqueta.svg'],
            ['hombre|Camisetas', 'Camisetas Originales', 'Camiseta Original Negra', 85000, 'CAM-ORI-01', '770100000003', '/images/products/camiseta.svg'],
            ['hombre|Camisetas', 'Camisetas Premium 1.1', 'Camiseta Premium 1.1 Boxeada', 99000, 'CAM-P11-01', '770100000004', '/images/products/camiseta.svg'],
            ['hombre|Camisetas', 'Camisetas Turcas', 'Camiseta Turca Básica', 75000, 'CAM-TUR-01', '770100000005', '/images/products/camiseta.svg'],
            ['hombre|Chanclas', 'Chanclas Premium 1.1', 'Chancla Premium 1.1', 45000, 'CHA-P11-01', '770100000006', '/images/products/accesorio.svg'],
            ['hombre|Conjuntos', 'Conjuntos Premium 1.1', 'Conjunto Premium 1.1', 219000, 'CON-P11-01', '770100000007', '/images/products/chaqueta.svg'],
            ['hombre|Gorras', 'Gorras Originales', 'Gorra Original Negra', 60000, 'GOR-ORI-01', '770100000008', '/images/products/accesorio.svg'],
            ['hombre|Jeans', null, 'Jean Cargo Negro', 139000, 'JEA-CAR-01', '770100000009', '/images/products/pantalon.svg'],
            ['hombre|Mochos', null, 'Mocho Pata de Gallo', 149000, 'MOC-PDG-01', '770100000010', '/images/products/pantalon.svg'],
            ['hombre|Pantalonetas', null, 'Pantaloneta Deportiva', 95000, 'PAN-DEP-01', '770100000011', '/images/products/pantalon.svg'],
            ['hombre|Perfumes', 'Perfumes Originales', 'Perfume Original 1.1', 159000, 'PER-ORI-01', '770100000012', '/images/products/accesorio.svg'],
            ['hombre|Sudaderas', 'Sudaderas Premium 1.1', 'Sudadera Premium 1.1', 169000, 'SUD-P11-01', '770100000013', '/images/products/chaqueta.svg'],
            ['hombre|Tenis', 'Tenis Originales', 'Tenis Original Blanco', 189000, 'TEN-ORI-01', '770100000014', '/images/products/chaqueta.svg'],
            ['hombre|Bolsos', 'Bolsos Premium 1.1', 'Bolso Premium 1.1', 120000, 'BOL-P11-01', '770100000015', '/images/products/accesorio.svg'],

            // MUJER
            ['mujer|Blusas', null, 'Blusa Seda', 65000, 'BLU-SED-01', '770100000016', '/images/products/camiseta.svg'],
            ['mujer|Jeans', null, 'Jeans Mujer', 129000, 'JEA-MUJ-01', '770100000017', '/images/products/pantalon.svg'],
            ['mujer|Tenis', 'Tenis Calidad 1.1', 'Tenis Mujer Calidad 1.1', 179000, 'TEN-MUJ-11', '770100000018', '/images/products/chaqueta.svg'],
            ['mujer|Bolsos', null, 'Bolso Mujer', 115000, 'BOL-MUJ-01', '770100000019', '/images/products/accesorio.svg'],
            ['mujer|Vestidos', null, 'Vestido Elegante', 149000, 'VES-ELE-01', '770100000020', '/images/products/camiseta.svg'],
            ['mujer|Chaquetas', null, 'Chaqueta Mujer', 189000, 'CHA-MUJ-01', '770100000021', '/images/products/chaqueta.svg'],
            ['mujer|Perfumes', 'Perfumes Calidad 1.1', 'Perfume Mujer Calidad 1.1', 155000, 'PER-MUJ-11', '770100000022', '/images/products/accesorio.svg'],
            ['mujer|Faldas', null, 'Falda Plisada', 88000, 'FAL-PLI-01', '770100000023', '/images/products/pantalon.svg'],
        ];

        foreach ($productos as [$catKey, $subNombre, $nombre, $precio, $sku, $codigo, $img]) {
            $catId = $categorias[$catKey]->id;
            $subId = $subNombre ? $subcategorias[$catId . '|' . $subNombre]->id : null;
            DB::table('productos')->insert([
                'nombre' => $nombre,
                'descripcion' => '',
                'precio' => $precio,
                'sku' => $sku,
                'codigo_barras' => $codigo,
                'categoria_id' => $catId,
                'subcategoria_id' => $subId,
                'imagen_url' => $img,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}