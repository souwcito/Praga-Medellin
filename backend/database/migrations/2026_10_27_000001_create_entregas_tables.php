<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Domicilios contra entrega / entregas en prueba: el cliente se lleva una o
// varias prendas sin pagar (para probarlas), el stock sale de la sede y la
// venta queda PENDIENTE hasta que se marca qué se quedó y se factura.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entregas', function (Blueprint $table) {
            $table->id();
            $table->string('numero')->unique(); // DOM-1001
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->nullOnDelete();
            $table->foreignId('sede_id')->constrained('sedes');
            $table->foreignId('empleado_id')->constrained('empleados');
            $table->string('direccion')->nullable();
            $table->string('telefono', 30)->nullable();
            $table->string('nota', 500)->nullable();
            $table->integer('total')->default(0);
            $table->string('estado')->default('pendiente'); // pendiente | facturada | cancelada
            $table->dateTime('fecha_entrega')->nullable();
            $table->dateTime('facturada_at')->nullable();
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->nullOnDelete();
            $table->timestamps();

            $table->index(['estado', 'fecha_entrega']);
        });

        Schema::create('entrega_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entrega_id')->constrained('entregas')->cascadeOnDelete();
            $table->foreignId('variante_id')->constrained('variantes');
            $table->foreignId('sede_origen_id')->nullable()->constrained('sedes')->nullOnDelete();
            $table->integer('cantidad');
            // Se llena al facturar: cuántas se quedó el cliente (el resto vuelve al stock).
            $table->integer('cantidad_facturada')->nullable();
            // Precio final cobrado por unidad (puede traer descuento del POS).
            $table->integer('precio_unitario');
            $table->integer('subtotal');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entrega_items');
        Schema::dropIfExists('entregas');
    }
};
