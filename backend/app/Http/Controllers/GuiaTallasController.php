<?php

namespace App\Http\Controllers;

// Guía de tallas de tenis en formato público y legible por el chatbot de
// WhatsApp / integraciones externas. La misma información está en la página
// https://pragamedellin.com/guia-tallas.
class GuiaTallasController extends Controller
{
    public function index()
    {
        $secciones = [
            [
                'id' => 'hombre',
                'titulo' => 'Hombre',
                'filas' => [
                    ['co' => '37', 'us' => '7', 'eur' => '40', 'cm' => '25'],
                    ['co' => '38', 'us' => '8', 'eur' => '41', 'cm' => '26'],
                    ['co' => '39/40', 'us' => '8.5/9', 'eur' => '42', 'cm' => '26.5'],
                    ['co' => '41', 'us' => '9.5', 'eur' => '43', 'cm' => '27'],
                    ['co' => '42', 'us' => '10', 'eur' => '44', 'cm' => '28'],
                ],
            ],
            [
                'id' => 'mujer',
                'titulo' => 'Mujer',
                'filas' => [
                    ['co' => '35', 'us' => '5/5.5', 'eur' => '36', 'cm' => '22.5'],
                    ['co' => '36', 'us' => '6', 'eur' => '37', 'cm' => '23.5'],
                    ['co' => '37', 'us' => '6.5/7', 'eur' => '38', 'cm' => '24'],
                    ['co' => '38', 'us' => '7.5/8', 'eur' => '39', 'cm' => '25'],
                ],
            ],
        ];

        $lineas = [
            'Guía de tallas de tenis y chanclas de Praga Medellín.',
            'En la tienda las tallas de tenis y chanclas se muestran en USA (US).',
            'Si estás entre dos tallas, elige la mayor.',
            'Las medidas en centímetros son de referencia y pueden variar según el modelo.',
            '',
        ];

        foreach ($secciones as $seccion) {
            $lineas[] = $seccion['titulo'] . ':';
            foreach ($seccion['filas'] as $fila) {
                $lineas[] = "- CO {$fila['co']} = USA {$fila['us']} = EUR {$fila['eur']} = {$fila['cm']} cm";
            }
            $lineas[] = '';
        }

        $lineas[] = 'Página web: https://pragamedellin.com/guia-tallas';
        $lineas[] = 'WhatsApp: https://wa.me/573216573427';

        return response()->json([
            'titulo' => 'Guía de tallas de tenis y chanclas',
            'tienda' => 'Praga Medellín',
            'sistema' => 'USA (US)',
            'actualizado' => '2026-10-25',
            'nota' => 'En la tienda las tallas de tenis y chanclas se muestran en USA (US). Si estás entre dos tallas, elige la mayor. Las medidas en centímetros son de referencia.',
            'url' => 'https://pragamedellin.com/guia-tallas',
            'whatsapp' => 'https://wa.me/573216573427',
            'secciones' => $secciones,
            'texto' => implode("\n", $lineas),
        ]);
    }
}
