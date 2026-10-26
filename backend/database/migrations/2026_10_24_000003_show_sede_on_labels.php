<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // La etiqueta muestra el código corto de la sede (AR, AN, AK, PW) en la
    // línea de referencia. Es un ajuste operativo del diseño.
    public function up(): void
    {
        DB::table('configuracion_etiquetas')->update([
            'show_sede' => true,
        ]);
    }

    public function down(): void
    {
        // Ajuste operativo; no se revierte automáticamente.
    }
};
