<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Múltiples imágenes por producto: lista JSON. imagen_url conserva la primera
// para compatibilidad con POS/inventario/tienda.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->json('imagenes')->nullable()->after('imagen_url');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('imagenes');
        });
    }
};