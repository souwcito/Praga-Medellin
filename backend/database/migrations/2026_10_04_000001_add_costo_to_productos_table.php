<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Costo del producto para el dueño (cuánto le sale cada producto). Se usa para
// valorar la mercancía por sede (costo × stock). Null = aún sin costo definido.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->integer('costo')->nullable()->after('precio');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('costo');
        });
    }
};