<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Sede de la que realmente salió cada variante. En ventas online el stock se
// reparte entre varias sedes (la sede "Online" nunca tiene stock), así que la
// devolución debe devolverlo a la sede de origen.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detalle_ventas', function (Blueprint $table) {
            $table->foreignId('sede_origen_id')
                ->nullable()
                ->after('variante_id')
                ->constrained('sedes')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('detalle_ventas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sede_origen_id');
        });
    }
};
