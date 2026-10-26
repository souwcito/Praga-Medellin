<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('configuracion_etiquetas', function (Blueprint $table) {
            $table->id();
            $table->decimal('page_width_mm', 7, 2)->default(104);
            $table->decimal('label_width_mm', 7, 2)->default(32);
            $table->decimal('label_height_mm', 7, 2)->default(25);
            $table->unsignedTinyInteger('columns')->default(3);
            $table->decimal('gap_h_mm', 7, 2)->default(2);
            $table->decimal('gap_v_mm', 7, 2)->default(0);
            $table->decimal('margin_top_mm', 7, 2)->default(0);
            $table->decimal('margin_right_mm', 7, 2)->default(2);
            $table->decimal('margin_bottom_mm', 7, 2)->default(0);
            $table->decimal('margin_left_mm', 7, 2)->default(2);
            $table->string('orientation', 20)->default('landscape');
            $table->decimal('barcode_height_mm', 7, 2)->default(9);
            $table->decimal('barcode_max_width_mm', 7, 2)->default(30);
            $table->decimal('font_size_pt', 5, 2)->default(9);
            $table->string('brand_text', 80)->default('PRAGA');
            $table->boolean('show_name')->default(true);
            $table->boolean('show_price')->default(true);
            $table->boolean('show_size')->default(true);
            $table->boolean('show_reference')->default(true);
            $table->boolean('show_sede')->default(false);
            $table->boolean('show_group')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configuracion_etiquetas');
    }
};
