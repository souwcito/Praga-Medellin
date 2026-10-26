<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Venta relámpago: una línea que no existe en inventario (sin variante).
// - variante_id pasa a nullable.
// - nombre y nota guardan lo que se vendió y una observación opcional.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detalle_ventas', function (Blueprint $table) {
            $table->foreignId('variante_id')->nullable()->change();
            $table->string('nombre')->nullable()->after('variante_id');
            $table->string('nota', 500)->nullable()->after('nombre');
        });
    }

    public function down(): void
    {
        Schema::table('detalle_ventas', function (Blueprint $table) {
            $table->dropColumn(['nombre', 'nota']);
            $table->foreignId('variante_id')->nullable(false)->change();
        });
    }
};
