<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Monto que entregó el cliente cuando el cambio es de mayor valor. Permite
// registrar cuánto pagó y calcular el vuelto en el historial.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devoluciones', function (Blueprint $table) {
            $table->integer('monto_pagado')->nullable()->after('diferencia');
        });
    }

    public function down(): void
    {
        Schema::table('devoluciones', function (Blueprint $table) {
            $table->dropColumn('monto_pagado');
        });
    }
};
