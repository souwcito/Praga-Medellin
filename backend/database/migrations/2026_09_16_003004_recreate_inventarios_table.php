<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// El inventario ahora es por VARIANTE (producto + talla), no por producto.
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('inventarios');
        Schema::create('inventarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variante_id')->constrained('variantes')->onDelete('cascade');
            $table->foreignId('sede_id')->constrained('sedes')->onDelete('cascade');
            $table->integer('stock')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventarios');
        Schema::create('inventarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sede_id')->constrained('sedes')->onDelete('cascade');
            $table->foreignId('producto_id')->constrained('productos')->onDelete('cascade');
            $table->integer('stock')->default(0);
            $table->timestamps();
        });
    }
};