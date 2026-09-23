<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Tallas OPCIONALES por categoría (ej. Gorras): el producto puede ser talla
// única o llevar tallas, a elección del administrador en el formulario.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->boolean('tallas_opcionales')->default(false)->after('tallas');
        });
    }

    public function down(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropColumn('tallas_opcionales');
        });
    }
};