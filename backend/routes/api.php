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
use App\Http\Controllers\ApartadoController;
use App\Http\Controllers\EntregaController;
use App\Http\Controllers\DuenoController;
use App\Http\Controllers\MarcaController;
use App\Http\Controllers\ColorController;
use App\Http\Controllers\EstiloController;
use App\Http\Controllers\ConfiguracionEtiquetaController;
use App\Http\Controllers\GuiaTallasController;

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
// Guía de tallas pública (también la consume el chatbot de WhatsApp).
Route::get('/guia-tallas', [GuiaTallasController::class, 'index']);
Route::post('/pedidos', [PedidoController::class, 'store'])->middleware('throttle:20,1');

// Checkout web con Wompi (público): config para el widget, confirmación síncrona
// y webhook de la pasarela.
Route::post('/pedidos/{numero}/wompi', [PedidoController::class, 'wompi'])->middleware('throttle:30,1');
Route::post('/pedidos/{numero}/confirmar', [PedidoController::class, 'confirmar'])->middleware('throttle:30,1');
Route::post('/wompi/webhook', [PedidoController::class, 'webhook'])->middleware('throttle:120,1');

// 3. Rutas PROTEGIDAS (panel): requieren token Sanctum
Route::middleware(['auth:sanctum', 'throttle:600,1'])->group(function () {
    Route::get('/empleados', [EmpleadoController::class, 'index']);

    // Inventario: el POS usa /inventario (stock de una sede) y
    // /inventario/completo (stock de todas las sedes para vender entre sedes);
    // la gestión de inventario y productos es solo para admin/dueno.
    Route::get('/inventario', [InventarioController::class, 'index']);
    Route::get('/inventario/completo', [InventarioController::class, 'completo']);

    // Catálogo de códigos (marcas, estilos, colores) para armar el SKU. Lectura.
    Route::get('/marcas', [MarcaController::class, 'index']);
    Route::get('/colores', [ColorController::class, 'index']);
    Route::get('/estilos', [EstiloController::class, 'index']);

    // Gestión (admin/dueno): crear/editar/borrar productos (precios), matriz
    // completa de inventario, ajustes de stock e imágenes.
    Route::middleware('role:admin,dueno')->group(function () {
        // Productos (escritura)
        Route::post('/productos', [ProductoController::class, 'store']);
        Route::put('/productos/{id}', [ProductoController::class, 'update']);
        Route::delete('/productos/{id}', [ProductoController::class, 'destroy']);
        Route::get('/productos/{id}/stock', [ProductoController::class, 'stock']);
        Route::get('/stickers/categoria', [ProductoController::class, 'stockCategoria']);

        // Configuración compartida del diseño de etiquetas.
        Route::get('/configuracion/etiquetas', [ConfiguracionEtiquetaController::class, 'show']);
        Route::put('/configuracion/etiquetas', [ConfiguracionEtiquetaController::class, 'update']);

        // Portada de categoría (imagen que se muestra en la tienda pública)
        Route::put('/categorias/{id}/portada', [CategoriaController::class, 'setPortada']);

        // Inventario (gestión)
        Route::post('/inventario/ajustes', [InventarioController::class, 'ajustes']);

        // Imágenes (se suben al editar un producto)
        Route::post('/imagenes', [ImagenController::class, 'store']);

        // Catálogo de códigos (marcas, estilos, colores): escritura
        Route::post('/marcas', [MarcaController::class, 'store']);
        Route::put('/marcas/{id}', [MarcaController::class, 'update']);
        Route::delete('/marcas/{id}', [MarcaController::class, 'destroy']);
        Route::post('/colores', [ColorController::class, 'store']);
        Route::put('/colores/{id}', [ColorController::class, 'update']);
        Route::delete('/colores/{id}', [ColorController::class, 'destroy']);
        Route::post('/estilos', [EstiloController::class, 'store']);
        Route::put('/estilos/{id}', [EstiloController::class, 'update']);
        Route::delete('/estilos/{id}', [EstiloController::class, 'destroy']);
    });

    // Ventas (POS + historial)
    Route::post('/ventas', [VentaController::class, 'store']);
    Route::put('/ventas/{id}', [VentaController::class, 'update']);
    Route::put('/ventas/{id}/abono', [VentaController::class, 'updateAbono']);
    Route::post('/ventas/{id}/revertir', [VentaController::class, 'revertir']);
    Route::get('/ventas/calendario', [VentaController::class, 'calendario']);
    Route::get('/ventas', [VentaController::class, 'index']);
    Route::get('/ventas/buscar', [VentaController::class, 'buscarPorFactura']);

    // Devoluciones y cambios: cajeros solo cambios de prendas; admin/dueño
    // también pueden registrar reembolsos internos.
    Route::get('/devoluciones', [DevolucionController::class, 'index']);
    Route::post('/devoluciones', [DevolucionController::class, 'store']);
    Route::get('/devoluciones/{id}', [DevolucionController::class, 'show']);

    // Informes
    Route::get('/dashboard', [DashboardController::class, 'resumen']);
    Route::get('/comisiones', [ComisionController::class, 'index']);

    // Clientes, pedidos y Plan Separe (gestión de cajeros y admin)
    Route::get('/clientes', [ClienteController::class, 'index']);
    Route::post('/clientes', [ClienteController::class, 'store']);
    Route::get('/pedidos', [PedidoController::class, 'index']);
    Route::post('/pedidos/{id}/tomar', [PedidoController::class, 'tomar']);

    // Plan Separe (apartados + abonos) — accesible a cajeros y admin
    Route::get('/apartados', [ApartadoController::class, 'index']);
    Route::post('/apartados', [ApartadoController::class, 'store']);
    Route::get('/apartados/{id}', [ApartadoController::class, 'show']);
    Route::put('/apartados/{id}', [ApartadoController::class, 'update']);
    Route::post('/apartados/{id}/abonos', [ApartadoController::class, 'abonar']);
    Route::post('/apartados/{id}/cancelar', [ApartadoController::class, 'cancelar']);

    // Domicilios contra entrega (entregas en prueba) — cajeros y admin.
    // El contador va antes que /{id} para que no lo capture la ruta dinámica.
    Route::get('/entregas/resumen', [EntregaController::class, 'resumen']);
    Route::get('/entregas', [EntregaController::class, 'index']);
    Route::post('/entregas', [EntregaController::class, 'store']);
    Route::get('/entregas/{id}', [EntregaController::class, 'show']);
    Route::post('/entregas/{id}/facturar', [EntregaController::class, 'facturar']);
    Route::post('/entregas/{id}/cancelar', [EntregaController::class, 'cancelar']);
});

// 4. Panel del DUEÑO (solo rol 'dueno'): costos y valoración de mercancía
Route::middleware(['auth:sanctum', 'role:dueno'])->group(function () {
    Route::get('/dueno/resumen', [DuenoController::class, 'resumen']);
    Route::put('/dueno/productos/{id}/costo', [DuenoController::class, 'updateCosto']);
});