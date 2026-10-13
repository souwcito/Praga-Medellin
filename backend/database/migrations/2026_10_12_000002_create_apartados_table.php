<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Plan Separe: el cliente aparta uno o varios productos y los va abonando.
// Al crear se descuentan las unidades del stock de la sede (salen del POS y de
// la web); al completar se genera la factura; al cancelar se devuelven al stock.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartados', function (Blueprint $table) {
            $table->id();
            $table->string('numero_interno')->unique(); // Ej: SEP-1001
            $table->foreignId('cliente_id')->constrained('clientes')->onDelete('cascade');
            $table->foreignId('sede_id')->constrained('sedes')->onDelete('cascade');
            $table->foreignId('empleado_id')->constrained('empleados')->onDelete('cascade');
            $table->integer('total');
            $table->integer('abonado')->default(0);
            $table->string('estado')->default('activo'); // activo | completado | cancelado
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartados');
    }
};