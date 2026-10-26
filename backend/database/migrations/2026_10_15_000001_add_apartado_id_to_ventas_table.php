<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Cada abono del Plan Separe genera una Venta (ingreso) de tipo 'plan_separe'.
// Este campo permite agrupar las ventas de un mismo plan (todas muestran el
// número SEP-XXXX del apartado).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->foreignId('apartado_id')
                ->nullable()
                ->after('sede_venta_id')
                ->constrained('apartados')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('apartado_id');
        });
    }
};
