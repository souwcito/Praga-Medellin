<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Recompensas del pedido online: subtotal antes del descuento, descuento aplicado
// (5%), snapshot de las metas alcanzadas (envío gratis / fragancia / 5%) y el
// número de factura generado al convertir el pedido pagado en una venta.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->integer('subtotal')->nullable()->after('total');
            $table->integer('descuento')->default(0)->after('subtotal');
            $table->json('recompensas')->nullable()->after('descuento');
            $table->string('factura_numero')->nullable()->after('recompensas');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['subtotal', 'descuento', 'recompensas', 'factura_numero']);
        });
    }
};
