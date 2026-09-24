<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Ofertas: precio anterior (tachado) y precio actual. Un producto está en
// oferta cuando precio_antes > precio. Índice para el filtro en_oferta.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->integer('precio_antes')->nullable()->after('precio');
            $table->index('precio_antes');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropIndex(['productos_precio_antes_index']);
            $table->dropColumn('precio_antes');
        });
    }
};