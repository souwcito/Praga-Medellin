<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SedeController;
use App\Http\Controllers\EmpleadoController;
use App\Http\Controllers\InventarioController;
use App\Http\Controllers\VentaController;

// 1. Login del Panel
Route::post('/login', [AuthController::class, 'login']);

// 2. Catálogo y sedes
Route::get('/sedes', [SedeController::class, 'index']);
Route::get('/empleados', [EmpleadoController::class, 'index']);
Route::get('/inventario', [InventarioController::class, 'index']);

// 3. Registrar venta (POS)
Route::post('/ventas', [VentaController::class, 'store']);