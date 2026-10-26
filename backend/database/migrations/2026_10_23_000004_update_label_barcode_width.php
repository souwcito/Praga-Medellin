<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // El nuevo diseño centrado puede usar 30 mm de ancho de código; el valor
    // anterior era 28 mm. Solo se actualiza si sigue siendo el valor antiguo.
    public function up(): void
    {
        DB::table('configuracion_etiquetas')
            ->where('barcode_max_width_mm', 28)
            ->update(['barcode_max_width_mm' => 30]);
    }

    public function down(): void
    {
        // Ajuste operativo; no se revierte.
    }
};
