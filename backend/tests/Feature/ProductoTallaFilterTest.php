<?php

namespace Tests\Feature;

use App\Models\Inventario;
use App\Models\Producto;
use App\Models\Sede;
use App\Models\Variante;
use App\Models\Categoria;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ProductoTallaFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_filtra_tenis_por_talla_usa_aunque_el_dato_tenga_eur(): void
    {
        Cache::flush();

        $sede = new Sede();
        $sede->nombre = 'Andalucía';
        $sede->direccion = 'Calle 107 # 47-27';
        $sede->save();

        $categoria = Categoria::create([
            'nombre' => 'Tenis',
            'catalogo' => 'hombre',
            'tallas' => ['7'],
        ]);

        $producto = Producto::create([
            'nombre' => 'Tenis Test',
            'precio' => 150000,
            'sku' => 'TENIS-FILTRO-1',
            'categoria_id' => $categoria->id,
        ]);

        $variante = Variante::create([
            'producto_id' => $producto->id,
            'talla' => '7-40', // formato anterior USA-EUR
            'codigo_barras' => 'TENIS-FILTRO-1-7',
        ]);

        Inventario::create([
            'variante_id' => $variante->id,
            'sede_id' => $sede->id,
            'stock' => 3,
        ]);

        // El filtro de la web envía la talla USA normalizada ("7").
        $this->getJson('/api/productos?talla=7')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $producto->id);

        // También debe funcionar si alguien conserva la URL vieja con "7-40".
        $this->getJson('/api/productos?talla=7-40')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $producto->id);
    }

    public function test_filtra_chanclas_por_talla_usa_y_quita_el_eur(): void
    {
        Cache::flush();

        $sede = new Sede();
        $sede->nombre = 'Andalucía';
        $sede->direccion = 'Calle 107 # 47-27';
        $sede->save();

        $categoria = Categoria::create([
            'nombre' => 'Chanclas',
            'catalogo' => 'hombre',
            'tallas' => ['6', '7-8'],
        ]);

        $producto = Producto::create([
            'nombre' => 'Chanclas Test',
            'precio' => 90000,
            'sku' => 'CHANCLAS-FILTRO-1',
            'categoria_id' => $categoria->id,
        ]);

        foreach (['7-8/43-44', '6-39'] as $indice => $talla) {
            $variante = Variante::create([
                'producto_id' => $producto->id,
                'talla' => $talla,
                'codigo_barras' => 'CHANCLAS-FILTRO-1-' . $indice,
            ]);
            Inventario::create([
                'variante_id' => $variante->id,
                'sede_id' => $sede->id,
                'stock' => 2,
            ]);
        }

        // La web envía "7-8" (USA) y debe encontrar "7-8/43-44".
        $this->getJson('/api/productos?talla=7-8')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $producto->id);

        // "7" y "8" también deben encontrar el rango "7-8".
        foreach (['7', '8'] as $tallaRango) {
            $this->getJson('/api/productos?talla=' . $tallaRango)
                ->assertOk()
                ->assertJsonCount(1)
                ->assertJsonPath('0.id', $producto->id);
        }

        // También funciona con el formato viejo "6-39" buscando "6".
        $this->getJson('/api/productos?talla=6')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $producto->id);

        // Y con una URL vieja que todavía traiga el EUR.
        $this->getJson('/api/productos?talla=7-8/43-44')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $producto->id);
    }
}
