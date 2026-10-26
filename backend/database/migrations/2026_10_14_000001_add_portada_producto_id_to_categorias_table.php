<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Portada de categoría: el producto cuya imagen se muestra como portada de la
// categoría en la tienda pública. Una sola por categoría (una columna), por lo
// que elegir otro producto reemplaza al anterior. nullOnDelete: si se borra el
// producto, la categoría queda sin portada (cae al comportamiento por defecto).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->foreignId('portada_producto_id')
                ->nullable()
                ->after('tallas_opcionales')
                ->constrained('productos')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropConstrainedForeignId('portada_producto_id');
        });
    }
};
