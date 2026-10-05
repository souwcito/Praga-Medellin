<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Pagos de una venta (una venta puede pagarse con varias formas: Efectivo,
// Banco, Addi, Sistecredito, Bold) + descuento por línea de detalle de venta.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->onDelete('cascade');
            $table->string('metodo_pago'); // efectivo | banco | addi | sistecredito | bold
            $table->integer('monto');
            $table->timestamps();
        });

        Schema::table('detalle_ventas', function (Blueprint $table) {
            $table->integer('descuento')->default(0)->after('precio_unitario');
        });
    }

    public function down(): void
    {
        Schema::table('detalle_ventas', function (Blueprint $table) {
            $table->dropColumn('descuento');
        });
        Schema::dropIfExists('pagos');
    }
};