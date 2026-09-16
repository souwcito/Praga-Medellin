<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// El detalle de venta ahora referencia la VARIANTE exacta vendida.
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('detalle_ventas');
        Schema::create('detalle_ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->onDelete('cascade');
            $table->foreignId('variante_id')->constrained('variantes')->onDelete('cascade');
            $table->integer('cantidad');
            $table->integer('precio_unitario');
            $table->integer('subtotal');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_ventas');
        Schema::create('detalle_ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->onDelete('cascade');
            $table->foreignId('producto_id')->constrained('productos')->onDelete('cascade');
            $table->integer('cantidad');
            $table->integer('precio_unitario');
            $table->integer('subtotal');
            $table->timestamps();
        });
    }
};