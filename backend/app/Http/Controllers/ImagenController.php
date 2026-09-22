<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ImagenController extends Controller
{
    // Sube una imagen y devuelve { imagen_url } absoluta
    public function store(Request $request)
    {
        $request->validate([
            'imagen' => 'required|file|mimes:jpeg,jpg,png,webp,heic,heif|max:10240',
        ]);

        $archivo = $request->file('imagen');
        $nombre = 'producto-' . time() . '-' . uniqid() . '.' . $archivo->getClientOriginalExtension();
        $destino = public_path('images/products');
        if (!is_dir($destino)) {
            mkdir($destino, 0755, true);
        }
        $archivo->move($destino, $nombre);

        return response()->json([
            'imagen_url' => 'images/products/' . $nombre,
        ], 201);
    }
}