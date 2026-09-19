<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Tipo de devolución: 'cambio' (intercambio por otro producto, por defecto) o
// 'reembolso' (devolución interna de dinero, caso extremo).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devoluciones', function (Blueprint $table) {
            $table->string('tipo')->default('cambio')->after('numero_interno');
        });
    }

    public function down(): void
    {
        Schema::table('devoluciones', function (Blueprint $table) {
            $table->dropColumn('tipo');
        });
    }
};