<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Detalle de la devolución: artículos DEVUELTOS (vuelven al inventario) y
// artículos de CAMBIO (salen del inventario), ambos por VARIANTE.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalle_devoluciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('devolucion_id')->constrained('devoluciones')->onDelete('cascade');
            $table->foreignId('variante_id')->constrained('variantes')->onDelete('cascade');
            $table->integer('cantidad');
            $table->integer('precio_unitario');
            $table->string('tipo'); // devuelto | cambio
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_devoluciones');
    }
};