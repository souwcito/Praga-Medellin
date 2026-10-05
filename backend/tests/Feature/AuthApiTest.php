<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_rutas_publicas_funcionan_sin_token(): void
    {
        $this->getJson('/api/sedes')->assertOk();
        $this->getJson('/api/categorias')->assertOk();
        $this->getJson('/api/subcategorias')->assertOk();
        $this->getJson('/api/productos')->assertOk();
    }

    public function test_rutas_protegidas_devuelven_401_sin_token(): void
    {
        $this->getJson('/api/ventas')->assertUnauthorized();
        $this->getJson('/api/dashboard')->assertUnauthorized();
        $this->getJson('/api/inventario/completo')->assertUnauthorized();
        $this->getJson('/api/comisiones')->assertUnauthorized();
        $this->getJson('/api/empleados')->assertUnauthorized();
        $this->getJson('/api/clientes')->assertUnauthorized();
        $this->getJson('/api/pedidos')->assertUnauthorized();
        $this->postJson('/api/productos', [])->assertUnauthorized();
        $this->postJson('/api/imagenes', [])->assertUnauthorized();
    }

    public function test_login_devuelve_401_con_credenciales_incorrectas(): void
    {
        $this->postJson('/api/login', [
            'email' => 'nadie@pragamedellin.com',
            'password' => 'clave-incorrecta',
        ])->assertUnauthorized();
    }

    public function test_login_con_token_accede_a_ruta_protegida(): void
    {
        $user = User::factory()->create(['password' => 'password']);
        $token = $user->createToken('test')->plainTextToken;

        $this->getJson('/api/ventas', ['Authorization' => 'Bearer ' . $token])->assertOk();
        $this->getJson('/api/dashboard', ['Authorization' => 'Bearer ' . $token])->assertOk();
    }
}