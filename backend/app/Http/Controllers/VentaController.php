<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use App\Models\DetalleVenta;
use App\Models\Inventario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VentaController extends Controller
{
    public function store(Request $request)
    {
        // 1. Validar que el frontend envíe todos los datos obligatorios
        $request->validate([
            'empleado_id' => 'required|integer',
            'sede_venta_id' => 'required|integer',
            'detalles' => 'required|array',
            'detalles.*.producto_id' => 'required|integer',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.precio_unitario' => 'required|integer',
        ]);

        try {
            // Iniciamos la transacción de seguridad
            DB::beginTransaction();

            // 2. Generar número interno (Ej: FAC-1001, FAC-1002...)
            $ultimaVenta = Venta::orderBy('id', 'desc')->first();
            $siguienteNumero = $ultimaVenta ? intval(str_replace('FAC-', '', $ultimaVenta->numero_interno)) + 1 : 1001;
            $numeroInterno = 'FAC-' . $siguienteNumero;

            // 3. Calcular el total a partir de los detalles
            $total = 0;
            foreach ($request->detalles as $detalle) {
                $total += $detalle['cantidad'] * $detalle['precio_unitario'];
            }

            // 4. Crear la Venta principal
            $venta = new Venta();
            $venta->empleado_id = $request->empleado_id;
            $venta->sede_venta_id = $request->sede_venta_id;
            $venta->tipo = $request->tipo ?? 'presencial';
            $venta->numero_interno = $numeroInterno;
            $venta->total = $total;
            $venta->save();

            // 5. Procesar los Detalles y descontar Inventario
            foreach ($request->detalles as $detalle) {
                $subtotal = $detalle['cantidad'] * $detalle['precio_unitario'];

                // Guardar el detalle
                $detalleVenta = new DetalleVenta();
                $detalleVenta->venta_id = $venta->id;
                $detalleVenta->producto_id = $detalle['producto_id'];
                $detalleVenta->cantidad = $detalle['cantidad'];
                $detalleVenta->precio_unitario = $detalle['precio_unitario'];
                $detalleVenta->subtotal = $subtotal;
                $detalleVenta->save();

                // Buscar el inventario en esa sede y descontar
                $inventario = Inventario::where('sede_id', $venta->sede_venta_id)
                                        ->where('producto_id', $detalle['producto_id'])
                                        ->first();
                
                if ($inventario) {
                    if ($inventario->stock < $detalle['cantidad']) {
                        throw new \Exception("Stock insuficiente para el producto ID: " . $detalle['producto_id']);
                    }
                    $inventario->stock -= $detalle['cantidad'];
                    $inventario->save();
                } else {
                    throw new \Exception("El producto ID: " . $detalle['producto_id'] . " no tiene inventario en esta sede.");
                }
            }

            // Si todo salió bien, guardamos los cambios en MySQL
            DB::commit();

            return response()->json([
                'mensaje' => 'Venta registrada exitosamente',
                'numero_interno' => $numeroInterno,
                'total' => $total
            ], 201);

        } catch (\Exception $e) {
            // Si hay un error (ej. falta de stock), deshacemos todo
            DB::rollBack();
            return response()->json(['error' => 'Error al procesar la venta: ' . $e->getMessage()], 400);
        }
    }
}