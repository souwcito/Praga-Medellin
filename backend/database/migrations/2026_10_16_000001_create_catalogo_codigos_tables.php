<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Catálogo de códigos para armar el SKU de los productos:
//   SKU = PRENDA + MARCA + ESTILO + CALIDAD + COLOR  (todo pegado, sin guiones)
//   Código de barras por talla = SKU-TALLA
// El catálogo (marcas, estilos y colores) se administra desde el panel.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marcas', function (Blueprint $table) {
            $table->id();
            $table->string('codigo'); // "01".."58"
            $table->string('nombre'); // "Clemont"
            $table->timestamps();
            $table->unique('codigo');
        });

        Schema::create('colores', function (Blueprint $table) {
            $table->id();
            $table->string('codigo'); // "01".."50"
            $table->string('nombre'); // "Negro"
            $table->timestamps();
            $table->unique('codigo');
        });

        Schema::create('estilos', function (Blueprint $table) {
            $table->id();
            $table->string('prenda'); // "GOR", "CAM", ...
            $table->string('codigo'); // "01", "02", ...
            $table->string('nombre');
            $table->timestamps();
            $table->unique(['prenda', 'codigo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estilos');
        Schema::dropIfExists('colores');
        Schema::dropIfExists('marcas');
    }
};
