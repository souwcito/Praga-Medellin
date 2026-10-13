<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Información de pago (Wompi) y referencia del pedido online.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('referencia')->nullable()->after('total'); // referencia Wompi
            $table->string('wompi_transaction_id')->nullable()->after('referencia');
            $table->string('metodo_pago')->nullable()->after('wompi_transaction_id');
            $table->string('franquicia')->nullable()->after('metodo_pago');
            $table->string('payment_status')->nullable()->after('franquicia');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['referencia', 'wompi_transaction_id', 'metodo_pago', 'franquicia', 'payment_status']);
        });
    }
};