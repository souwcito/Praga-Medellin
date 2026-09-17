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

// 1. Login del Panel (cuenta única)
Route::post('/login', [AuthController::class, 'login']);

// 2. Catálogo y sedes
Route::get('/sedes', [SedeController::class, 'index']);
Route::get('/empleados', [EmpleadoController::class, 'index']);
Route::get('/categorias', [CategoriaController::class, 'index']);
Route::get('/subcategorias', [SubcategoriaController::class, 'index']);

// 3. Productos (CRUD con variantes)
Route::get('/productos', [ProductoController::class, 'index']);
Route::post('/productos', [ProductoController::class, 'store']);
Route::get('/productos/{id}', [ProductoController::class, 'show']);
Route::put('/productos/{id}', [ProductoController::class, 'update']);
Route::delete('/productos/{id}', [ProductoController::class, 'destroy']);

// 4. Inventario por variante
Route::get('/inventario', [InventarioController::class, 'index']);
Route::get('/inventario/completo', [InventarioController::class, 'completo']);
Route::post('/inventario/ajustes', [InventarioController::class, 'ajustes']);

// 5. Ventas (POS + historial)
Route::post('/ventas', [VentaController::class, 'store']);
Route::get('/ventas', [VentaController::class, 'index']);

// 6. Informes
Route::get('/dashboard', [DashboardController::class, 'resumen']);
Route::get('/comisiones', [ComisionController::class, 'index']);

// 7. Imágenes
Route::post('/imagenes', [ImagenController::class, 'store']);

// 8. Clientes y pedidos online
Route::get('/clientes', [ClienteController::class, 'index']);
Route::get('/pedidos', [PedidoController::class, 'index']);
Route::post('/pedidos', [PedidoController::class, 'store']);