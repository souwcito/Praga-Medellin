<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Ajusta la configuración existente a la nueva etiqueta centrada: fuente
    // base de 9 pt y sin sede ni grupo en el sticker. Solo cambia el valor 7
    // anterior para no pisar un tamaño que el usuario haya elegido después.
    public function up(): void
    {
        DB::table('configuracion_etiquetas')
            ->where('font_size_pt', 7)
            ->update(['font_size_pt' => 9]);

        DB::table('configuracion_etiquetas')->update([
            'show_sede' => false,
            'show_group' => false,
        ]);
    }

    public function down(): void
    {
        // No se revierte: la configuración de etiquetas es un ajuste operativo.
    }
};
