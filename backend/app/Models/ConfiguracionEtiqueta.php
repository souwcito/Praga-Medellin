<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfiguracionEtiqueta extends Model
{
    protected $table = 'configuracion_etiquetas';

    protected $fillable = [
        'page_width_mm',
        'label_width_mm',
        'label_height_mm',
        'columns',
        'gap_h_mm',
        'gap_v_mm',
        'margin_top_mm',
        'margin_right_mm',
        'margin_bottom_mm',
        'margin_left_mm',
        'orientation',
        'barcode_height_mm',
        'barcode_max_width_mm',
        'font_size_pt',
        'brand_text',
        'show_name',
        'show_price',
        'show_size',
        'show_reference',
        'show_sede',
        'show_group',
    ];

    protected $casts = [
        'page_width_mm' => 'float',
        'label_width_mm' => 'float',
        'label_height_mm' => 'float',
        'columns' => 'integer',
        'gap_h_mm' => 'float',
        'gap_v_mm' => 'float',
        'margin_top_mm' => 'float',
        'margin_right_mm' => 'float',
        'margin_bottom_mm' => 'float',
        'margin_left_mm' => 'float',
        'orientation' => 'string',
        'barcode_height_mm' => 'float',
        'barcode_max_width_mm' => 'float',
        'font_size_pt' => 'float',
        'brand_text' => 'string',
        'show_name' => 'boolean',
        'show_price' => 'boolean',
        'show_size' => 'boolean',
        'show_reference' => 'boolean',
        'show_sede' => 'boolean',
        'show_group' => 'boolean',
    ];
}
