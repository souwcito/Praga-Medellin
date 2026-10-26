<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Separa el catálogo de códigos (marcas, colores, estilos) por catálogo:
// hombre / mujer (y fragancia). Cada catálogo arranca independiente, así los
// códigos de mujer empiezan de cero sin mezclarse con los de hombre.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marcas', function (Blueprint $table) {
            $table->string('catalogo')->default('hombre')->after('id')->index();
            $table->dropUnique(['codigo']);
            $table->unique(['catalogo', 'codigo']);
        });

        Schema::table('colores', function (Blueprint $table) {
            $table->string('catalogo')->default('hombre')->after('id')->index();
            $table->dropUnique(['codigo']);
            $table->unique(['catalogo', 'codigo']);
        });

        Schema::table('estilos', function (Blueprint $table) {
            $table->string('catalogo')->default('hombre')->after('id')->index();
            $table->dropUnique(['prenda', 'codigo']);
            $table->unique(['catalogo', 'prenda', 'codigo']);
        });
    }

    public function down(): void
    {
        Schema::table('estilos', function (Blueprint $table) {
            $table->dropUnique(['catalogo', 'prenda', 'codigo']);
            $table->unique(['prenda', 'codigo']);
            $table->dropColumn('catalogo');
        });

        Schema::table('colores', function (Blueprint $table) {
            $table->dropUnique(['catalogo', 'codigo']);
            $table->unique(['codigo']);
            $table->dropColumn('catalogo');
        });

        Schema::table('marcas', function (Blueprint $table) {
            $table->dropUnique(['catalogo', 'codigo']);
            $table->unique(['codigo']);
            $table->dropColumn('catalogo');
        });
    }
};
