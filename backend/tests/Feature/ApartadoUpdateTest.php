<?php

namespace Tests\Feature;

use App\Models\Abono;
use App\Models\Apartado;
use App\Models\ApartadoItem;
use App\Models\Cliente;
use App\Models\Empleado;
use App\Models\Inventario;
use App\Models\Producto;
use App\Models\Sede;
use App\Models\User;
use App\Models\Variante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartadoUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function headers(string $token): array
    {
        return ['Authorization' => 'Bearer ' . $token];
    }

    private function escenario(): array
    {
        $sede = new Sede();
        $sede->nombre = 'Andalucía';
        $sede->direccion = 'Calle 107 # 47-27';
        $sede->save();

        $empleado = new Empleado();
        $empleado->nombre = 'Vendedor Test';
        $empleado->rol = 'vendedor';
        $empleado->sede_id = $sede->id;
        $empleado->save();

        $producto = Producto::create([
            'nombre' => 'Camiseta Test',
            'precio' => 10000,
            'sku' => 'CAM-UPDATE-1',
        ]);
        $variante = Variante::create([
            'producto_id' => $producto->id,
            'talla' => 'M',
            'codigo_barras' => 'CAM-UPDATE-1-M',
        ]);
        Inventario::create([
            'variante_id' => $variante->id,
            'sede_id' => $sede->id,
            'stock' => 8, // quedan 8 después de apartar 2
        ]);

        $cliente = Cliente::create([
            'nombre' => 'Cliente Test',
            'telefono' => '3000000000',
            'ciudad' => 'Medellín',
        ]);

        $apartado = Apartado::create([
            'numero_interno' => 'SEP-TEST-1',
            'cliente_id' => $cliente->id,
            'sede_id' => $sede->id,
            'empleado_id' => $empleado->id,
            'total' => 20000,
            'abonado' => 5000,
            'estado' => 'activo',
        ]);

        ApartadoItem::create([
            'apartado_id' => $apartado->id,
            'variante_id' => $variante->id,
            'cantidad' => 2,
            'precio_unitario' => 10000,
            'subtotal' => 20000,
        ]);

        Abono::create([
            'apartado_id' => $apartado->id,
            'monto' => 5000,
            'metodo_pago' => 'efectivo',
            'empleado_id' => $empleado->id,
        ]);

        return compact('sede', 'empleado', 'producto', 'variante', 'cliente', 'apartado');
    }

    public function test_modificar_plan_ajusta_stock_y_total(): void
    {
        $datos = $this->escenario();
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        // Aumenta de 2 a 3 unidades: descuenta 1 más del stock (8 -> 7).
        $this->putJson(
            "/api/apartados/{$datos['apartado']->id}",
            [
                'items' => [
                    ['variante_id' => $datos['variante']->id, 'cantidad' => 3],
                ],
            ],
            $this->headers($token)
        )
            ->assertOk()
            ->assertJsonPath('total', 30000)
            ->assertJsonPath('abonado', 5000)
            ->assertJsonPath('saldo', 25000);

        $this->assertDatabaseHas('inventarios', [
            'variante_id' => $datos['variante']->id,
            'sede_id' => $datos['sede']->id,
            'stock' => 7,
        ]);
        $this->assertDatabaseHas('apartado_items', [
            'apartado_id' => $datos['apartado']->id,
            'variante_id' => $datos['variante']->id,
            'cantidad' => 3,
            'subtotal' => 30000,
        ]);
    }

    public function test_no_permite_bajar_el_total_debajo_de_lo_abonado(): void
    {
        $datos = $this->escenario();
        $datos['apartado']->abonado = 15000;
        $datos['apartado']->save();

        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        // 1 unidad = 10.000, menor a los 15.000 ya abonados.
        $this->putJson(
            "/api/apartados/{$datos['apartado']->id}",
            [
                'items' => [
                    ['variante_id' => $datos['variante']->id, 'cantidad' => 1],
                ],
            ],
            $this->headers($token)
        )
            ->assertStatus(400)
            ->assertJsonPath('error', fn ($valor) => str_contains($valor, 'menor a lo ya abonado'));

        // No debe haber tocado ni stock ni ítems.
        $this->assertDatabaseHas('inventarios', [
            'variante_id' => $datos['variante']->id,
            'sede_id' => $datos['sede']->id,
            'stock' => 8,
        ]);
        $this->assertDatabaseHas('apartado_items', [
            'apartado_id' => $datos['apartado']->id,
            'cantidad' => 2,
        ]);
    }
}
