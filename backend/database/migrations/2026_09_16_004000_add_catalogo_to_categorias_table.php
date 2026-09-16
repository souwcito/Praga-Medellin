<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Cada categoría pertenece a un catálogo: hombre o mujer.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->string('catalogo')->default('hombre')->after('nombre');
            $table->index('catalogo');
        });
    }

    public function down(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropIndex(['catalogo']);
            $table->dropColumn('catalogo');
        });
    }
};