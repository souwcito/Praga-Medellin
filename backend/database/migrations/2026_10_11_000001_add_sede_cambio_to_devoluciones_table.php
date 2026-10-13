<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Sede del CAMBIO: de dónde salen los productos que el cliente se lleva a cambio.
// Puede ser distinta de `sede_id` (sede donde se recibe la devolución). Si es
// null, el cambio se toma de la misma sede de la devolución.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devoluciones', function (Blueprint $table) {
            $table->foreignId('sede_cambio_id')
                ->nullable()
                ->after('sede_id')
                ->constrained('sedes')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('devoluciones', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sede_cambio_id');
        });
    }
};
