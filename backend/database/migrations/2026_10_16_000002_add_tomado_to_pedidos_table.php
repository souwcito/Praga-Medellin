<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// "Tomado por": marca que alguien del equipo ya está atendiendo el pedido, para
// que no lo procesen varias veces desde el panel.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('tomado_por')->nullable()->after('estado');
            $table->timestamp('tomado_at')->nullable()->after('tomado_por');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['tomado_por', 'tomado_at']);
        });
    }
};
