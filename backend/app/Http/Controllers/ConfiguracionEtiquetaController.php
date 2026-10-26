<?php

namespace App\Http\Controllers;

use App\Models\ConfiguracionEtiqueta;
use Illuminate\Http\Request;

class ConfiguracionEtiquetaController extends Controller
{
    // Formato provisional confirmado por el usuario: etiqueta de 30 x 20 mm,
    // 3 columnas. La pagina de una fila se deriva de los margenes y
    // separaciones existentes: 2 + 3*30 + 2*2 + 2 = 98 mm.
    // PENDIENTE: ancho real del soporte, separaciones y margenes fisicos.
    private function valoresIniciales(): array
    {
        return [
            'page_width_mm' => 98,
            'label_width_mm' => 30,
            'label_height_mm' => 20,
            'columns' => 3,
            'gap_h_mm' => 2,
            'gap_v_mm' => 0,
            'margin_top_mm' => 0,
            'margin_right_mm' => 2,
            'margin_bottom_mm' => 0,
            'margin_left_mm' => 2,
            'orientation' => 'landscape',
            'barcode_height_mm' => 7,
            'barcode_max_width_mm' => 28,
            'font_size_pt' => 9,
            'brand_text' => 'PRAGA',
            'show_name' => true,
            'show_price' => true,
            'show_size' => true,
            'show_reference' => true,
            'show_sede' => true,
            'show_group' => false,
        ];
    }

    private function configuracion(): ConfiguracionEtiqueta
    {
        return ConfiguracionEtiqueta::query()->firstOrCreate(
            ['id' => 1],
            $this->valoresIniciales(),
        );
    }

    public function show()
    {
        return response()->json($this->respuesta($this->configuracion()));
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'page_width_mm' => 'required|numeric|min:20|max:300',
            'label_width_mm' => 'required|numeric|min:5|max:300',
            'label_height_mm' => 'required|numeric|min:5|max:300',
            'columns' => 'required|integer|min:1|max:10',
            'gap_h_mm' => 'required|numeric|min:0|max:100',
            'gap_v_mm' => 'required|numeric|min:0|max:100',
            'margin_top_mm' => 'required|numeric|min:0|max:100',
            'margin_right_mm' => 'required|numeric|min:0|max:100',
            'margin_bottom_mm' => 'required|numeric|min:0|max:100',
            'margin_left_mm' => 'required|numeric|min:0|max:100',
            'orientation' => 'required|in:landscape,portrait',
            'barcode_height_mm' => 'required|numeric|min:2|max:60',
            'barcode_max_width_mm' => 'required|numeric|min:5|max:200',
            'font_size_pt' => 'required|numeric|min:3|max:24',
            'brand_text' => 'required|string|max:80',
            'show_name' => 'required|boolean',
            'show_price' => 'required|boolean',
            'show_size' => 'required|boolean',
            'show_reference' => 'required|boolean',
            'show_sede' => 'required|boolean',
            'show_group' => 'required|boolean',
        ]);

        $columnas = (int) $data['columns'];
        $anchoEtiquetas = (float) $data['label_width_mm'] * $columnas;
        $separaciones = (float) $data['gap_h_mm'] * max(0, $columnas - 1);
        $margenes = (float) $data['margin_left_mm'] + (float) $data['margin_right_mm'];
        $necesario = $anchoEtiquetas + $separaciones + $margenes;

        if ($necesario > (float) $data['page_width_mm'] + 0.01) {
            return response()->json([
                'error' => 'La distribución horizontal no cabe en el ancho de página.',
                'required_width_mm' => round($necesario, 2),
                'page_width_mm' => (float) $data['page_width_mm'],
            ], 422);
        }

        $config = $this->configuracion();
        $config->update($data);

        return response()->json($this->respuesta($config->fresh()));
    }

    private function respuesta(ConfiguracionEtiqueta $config): array
    {
        $necesario = (float) $config->label_width_mm * (int) $config->columns
            + (float) $config->gap_h_mm * max(0, (int) $config->columns - 1)
            + (float) $config->margin_left_mm
            + (float) $config->margin_right_mm;

        return [
            ...$config->toArray(),
            'required_width_mm' => round($necesario, 2),
            'width_fits' => $necesario <= (float) $config->page_width_mm + 0.01,
        ];
    }
}
