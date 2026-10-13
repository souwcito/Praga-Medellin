<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Cédula/documento del cliente para el Plan Separe (búsqueda por cédula o nombre).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->string('documento')->nullable()->unique()->after('nombre');
        });
    }

    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropUnique(['documento']);
            $table->dropColumn('documento');
        });
    }
};