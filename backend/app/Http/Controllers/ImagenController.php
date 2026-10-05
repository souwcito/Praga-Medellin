<?php

namespace App\Http\Controllers;

use App\Services\ImageService;
use Illuminate\Http\Request;

class ImagenController extends Controller
{
    // Sube una imagen, la optimiza (WebP: full/medium/thumb) y devuelve las rutas.
    public function store(Request $request, ImageService $imageService)
    {
        $request->validate([
            'imagen' => 'required|file|mimes:jpeg,jpg,png,webp,heic,heif|max:10240',
        ]);

        $variantes = $imageService->optimizar($request->file('imagen'));

        return response()->json([
            'imagen_url' => $variantes['full'],
            'imagen_thumb' => $variantes['thumb'],
            'imagen_medium' => $variantes['medium'],
        ], 201);
    }
}