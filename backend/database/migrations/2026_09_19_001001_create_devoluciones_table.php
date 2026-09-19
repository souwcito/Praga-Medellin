<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Devoluciones: cambio de un producto comprado (venta) por otro de igual o
// mayor valor en el punto físico. El inventario se actualiza en la sede.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devoluciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->onDelete('cascade');
            $table->foreignId('sede_id')->constrained('sedes')->onDelete('cascade');
            $table->foreignId('empleado_id')->constrained('empleados')->onDelete('cascade');
            $table->string('numero_interno')->unique(); // Ej: DEV-1001
            $table->integer('total_devuelto'); // Valor de lo que devuelve el cliente
            $table->integer('total_cambio'); // Valor de los productos nuevos que se lleva
            $table->integer('diferencia'); // total_cambio - total_devuelto (>= 0)
            $table->string('metodo_pago')->nullable(); // Cómo paga la diferencia
            $table->string('motivo')->nullable();
            $table->string('estado')->default('completada');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devoluciones');
    }
};