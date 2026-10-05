<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SedeController;
use App\Http\Controllers\EmpleadoController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\SubcategoriaController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\InventarioController;
use App\Http\Controllers\VentaController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ComisionController;
use App\Http\Controllers\ImagenController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\DevolucionController;
use App\Http\Controllers\DuenoController;

/*
|--------------------------------------------------------------------------
| API — Praga Medellín
|--------------------------------------------------------------------------
| Rutas públicas (tienda + login) y rutas protegidas del panel (auth:sanctum).
| El token se obtiene en POST /api/login (Bearer). El login lleva throttle
| anti fuerza bruta; el grupo protegido tiene un límite amplio (el POS hace
| polling cada 20 s y pueden haber varias cajas por sede).
*/

// 1. Login del Panel (cuenta única) — con límite anti fuerza bruta (10/min por IP)
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// 2. Rutas PÚBLICAS (tienda): catálogo y pedidos online
Route::get('/sedes', [SedeController::class, 'index']);
Route::get('/categorias', [CategoriaController::class, 'index']);
Route::get('/subcategorias', [SubcategoriaController::class, 'index']);
Route::get('/productos', [ProductoController::class, 'index']);
Route::get('/productos/{id}', [ProductoController::class, 'show']);
Route::post('/pedidos', [PedidoController::class, 'store'])->middleware('throttle:20,1');

// 3. Rutas PROTEGIDAS (panel): requieren token Sanctum
Route::middleware(['auth:sanctum', 'throttle:600,1'])->group(function () {
    Route::get('/empleados', [EmpleadoController::class, 'index']);

    // Productos (escritura)
    Route::post('/productos', [ProductoController::class, 'store']);
    Route::put('/productos/{id}', [ProductoController::class, 'update']);
    Route::delete('/productos/{id}', [ProductoController::class, 'destroy']);

    // Inventario
    Route::get('/inventario', [InventarioController::class, 'index']);
    Route::get('/inventario/completo', [InventarioController::class, 'completo']);
    Route::post('/inventario/ajustes', [InventarioController::class, 'ajustes']);

    // Ventas (POS + historial)
    Route::post('/ventas', [VentaController::class, 'store']);
    Route::get('/ventas', [VentaController::class, 'index']);
    Route::get('/ventas/buscar', [VentaController::class, 'buscarPorFactura']);

    // Devoluciones
    Route::get('/devoluciones', [DevolucionController::class, 'index']);
    Route::post('/devoluciones', [DevolucionController::class, 'store']);
    Route::get('/devoluciones/{id}', [DevolucionController::class, 'show']);

    // Informes
    Route::get('/dashboard', [DashboardController::class, 'resumen']);
    Route::get('/comisiones', [ComisionController::class, 'index']);

    // Imágenes
    Route::post('/imagenes', [ImagenController::class, 'store']);

    // Clientes y pedidos (gestión)
    Route::get('/clientes', [ClienteController::class, 'index']);
    Route::get('/pedidos', [PedidoController::class, 'index']);
});

// 4. Panel del DUEÑO (solo rol 'dueno'): costos y valoración de mercancía
Route::middleware(['auth:sanctum', 'role:dueno'])->group(function () {
    Route::get('/dueno/resumen', [DuenoController::class, 'resumen']);
    Route::put('/dueno/productos/{id}/costo', [DuenoController::class, 'updateCosto']);
});