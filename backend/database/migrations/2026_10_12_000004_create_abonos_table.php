<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Abonos (pagos parciales) de un Plan Separe. Método: efectivo o transferencia.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('abonos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('apartado_id')->constrained('apartados')->onDelete('cascade');
            $table->integer('monto');
            $table->string('metodo_pago'); // efectivo | transferencia
            $table->foreignId('empleado_id')->constrained('empleados')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('abonos');
    }
};