<?php

namespace App\Http\Controllers;

abstract class Controller
{
    // Arma la URL absoluta de una imagen usando el host de la petición actual.
    // Así las imágenes funcionan en cualquier dominio (temporal o definitivo)
    // sin necesidad de cambiar datos guardados en la BD.
    protected function imagenUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        return request()->getSchemeAndHttpHost() . '/' . ltrim($path, '/');
    }
}