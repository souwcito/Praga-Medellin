<?php

namespace Tests\Feature;

use App\Models\Sede;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VariantesSyncTest extends TestCase
{
    use RefreshDatabase;

    private function crearSede(): Sede
    {
        $s = new Sede();
        $s->nombre = 'Andalucía';
        $s->direccion = 'Calle 107 # 47-27';
        $s->save();

        return $s;
    }

    private function headers(string $token): array
    {
        return ['Authorization' => 'Bearer ' . $token];
    }

    public function test_editar_variantes_agrega_y_elimina_tallas_sin_cambiar_categoria(): void
    {
        $this->crearSede();
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        // Crea con tallas S, M, L
        $crear = $this->postJson('/api/productos', [
            'nombre' => 'Camiseta Test',
            'precio' => 50000,
            'sku' => 'CAM-TEST-1',
            'variantes' => [
                ['talla' => 'S', 'codigo_barras' => '7701111111', 'stock_inicial' => 5],
                ['talla' => 'M', 'codigo_barras' => '7701111112', 'stock_inicial' => 5],
                ['talla' => 'L', 'codigo_barras' => '7701111113', 'stock_inicial' => 5],
            ],
        ], $this->headers($token))->assertCreated();

        $id = $crear->json('id');
        $this->assertNotNull($id);

        // Edita: quita M, agrega XL
        $this->putJson("/api/productos/{$id}", [
            'nombre' => 'Camiseta Test',
            'precio' => 50000,
            'sku' => 'CAM-TEST-1',
            'variantes' => [
                ['talla' => 'S', 'codigo_barras' => '7701111111'],
                ['talla' => 'L', 'codigo_barras' => '7701111113'],
                ['talla' => 'XL', 'codigo_barras' => '7701111114'],
            ],
        ], $this->headers($token))->assertOk();

        $res = $this->getJson("/api/productos/{$id}")->assertOk();
        $tallas = collect($res->json('variantes'))->pluck('talla')->sort()->values();
        $this->assertEquals(['L', 'S', 'XL'], $tallas->all());
    }

    public function test_editar_sin_cambiar_tallas_no_borra_variantes(): void
    {
        $this->crearSede();
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $crear = $this->postJson('/api/productos', [
            'nombre' => 'Buzo Test',
            'precio' => 80000,
            'sku' => 'BUZ-TEST-1',
            'variantes' => [
                ['talla' => 'M', 'codigo_barras' => '7702222221'],
                ['talla' => 'L', 'codigo_barras' => '7702222222'],
            ],
        ], $this->headers($token))->assertCreated();
        $id = $crear->json('id');

        // Reenvía las mismas tallas (p. ej. solo cambió el precio)
        $this->putJson("/api/productos/{$id}", [
            'nombre' => 'Buzo Test',
            'precio' => 85000,
            'sku' => 'BUZ-TEST-1',
            'variantes' => [
                ['talla' => 'M', 'codigo_barras' => '7702222221'],
                ['talla' => 'L', 'codigo_barras' => '7702222222'],
            ],
        ], $this->headers($token))->assertOk();

        $res = $this->getJson("/api/productos/{$id}")->assertOk();
        $this->assertCount(2, $res->json('variantes'));
    }

    public function test_genera_codigos_legibles_para_tallas_con_barra_y_unitalla(): void
    {
        $this->crearSede();
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        // Sin codigo_barras explícito: el backend lo deriva del SKU y la talla.
        $crear = $this->postJson('/api/productos', [
            'nombre' => 'Body Test',
            'precio' => 70000,
            'sku' => 'BOD-TEST-1',
            'variantes' => [
                ['talla' => 'S/M'],
                ['talla' => 'Talla única'],
            ],
        ], $this->headers($token))->assertCreated();

        $res = $this->getJson('/api/productos/' . $crear->json('id'))->assertOk();
        $codigos = collect($res->json('variantes'))->pluck('codigo_barras', 'talla');

        // La barra de la talla se conserva y la talla única no lleva sufijo.
        $this->assertSame('BOD-TEST-1-S/M', $codigos['S/M']);
        $this->assertSame('BOD-TEST-1', $codigos['Talla única']);
    }

    public function test_cambiar_talla_de_chancla_conserva_stock_y_codigo(): void
    {
        $this->crearSede();
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $crear = $this->postJson('/api/productos', [
            'nombre' => 'Chancla Test',
            'precio' => 90000,
            'sku' => 'CHAN-TEST-1',
            'variantes' => [
                [
                    'talla' => '6-7/8-9',
                    'codigo_barras' => 'CHAN-TEST-1-6-7',
                    'stock_inicial' => 5,
                ],
            ],
        ], $this->headers($token))->assertCreated();

        $productoId = $crear->json('id');
        $varianteId = $crear->json('variantes.0.id');

        $this->putJson("/api/productos/{$productoId}", [
            'nombre' => 'Chancla Test',
            'precio' => 90000,
            'sku' => 'CHAN-TEST-1',
            'variantes' => [
                [
                    'id' => $varianteId,
                    'talla' => '6-7',
                    'codigo_barras' => 'CHAN-TEST-1-6-7',
                    'stock_inicial' => '',
                ],
            ],
        ], $this->headers($token))->assertOk();

        $res = $this->getJson("/api/productos/{$productoId}")->assertOk();
        $this->assertCount(1, $res->json('variantes'));
        $this->assertSame('6-7', $res->json('variantes.0.talla'));
        $this->assertSame('CHAN-TEST-1-6-7', $res->json('variantes.0.codigo_barras'));
        $this->assertSame(5, $res->json('variantes.0.stock_total'));
    }
}