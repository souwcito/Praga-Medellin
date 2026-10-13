<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Productos (por variante) que el cliente aparta en su Plan Separe.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartado_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('apartado_id')->constrained('apartados')->onDelete('cascade');
            $table->foreignId('variante_id')->constrained('variantes')->onDelete('cascade');
            $table->integer('cantidad');
            $table->integer('precio_unitario');
            $table->integer('subtotal');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartado_items');
    }
};