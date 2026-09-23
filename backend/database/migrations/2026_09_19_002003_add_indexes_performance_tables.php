<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Índices para escalar a cientos de productos:
// - inventarios (variante_id, sede_id): consultas frecuentes de stock del POS y devoluciones
// - ventas.created_at y devoluciones.created_at: filtros por periodo (dashboard/historial)
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventarios', function (Blueprint $table) {
            $table->index(['variante_id', 'sede_id']);
        });
        Schema::table('ventas', function (Blueprint $table) {
            $table->index('created_at');
        });
        Schema::table('devoluciones', function (Blueprint $table) {
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('inventarios', function (Blueprint $table) {
            $table->dropIndex(['variante_id', 'sede_id']);
        });
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropIndex(['ventas_created_at_index']);
        });
        Schema::table('devoluciones', function (Blueprint $table) {
            $table->dropIndex(['devoluciones_created_at_index']);
        });
    }
};