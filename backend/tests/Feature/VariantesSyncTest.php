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
}