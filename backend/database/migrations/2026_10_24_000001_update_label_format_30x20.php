<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Migra únicamente la configuración que todavía tiene los valores
    // provisionales antiguos (104 x 32 x 25, 3 columnas). Si el usuario ya
    // personalizó las medidas, no se toca.
    public function up(): void
    {
        DB::table('configuracion_etiquetas')
            ->where('page_width_mm', 104)
            ->where('label_width_mm', 32)
            ->where('label_height_mm', 25)
            ->where('columns', 3)
            ->update([
                'page_width_mm' => 98,
                'label_width_mm' => 30,
                'label_height_mm' => 20,
                'gap_h_mm' => 2,
                'gap_v_mm' => 0,
                'margin_top_mm' => 0,
                'margin_right_mm' => 2,
                'margin_bottom_mm' => 0,
                'margin_left_mm' => 2,
                'barcode_height_mm' => 7,
                'barcode_max_width_mm' => 28,
            ]);
    }

    public function down(): void
    {
        // Es un ajuste operativo de impresión; no se revierte automáticamente.
    }
};
