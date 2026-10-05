<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Cache;

abstract class Controller
{
    // Arma la URL absoluta de una imagen. Usa la base configurada (app.url) para
    // que las URLs queden siempre en el dominio definitivo (pragamedellin.com) y
    // no dependan del host de la petición (host temporal de Hostinger). En local
    // (sin app.url configurada) cae al host de la petición para que siga funcionando.
    protected function imagenUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        $base = config('app.url');
        if (!$base || str_contains($base, 'localhost')) {
            $base = request()->getSchemeAndHttpHost();
        }
        return rtrim($base, '/') . '/' . ltrim($path, '/');
    }

    // Versión global de caché: sube cuando hay escrituras (ventas, productos,
    // devoluciones, ajustes), invalidando de una vez las listas cacheadas.
    protected function cacheVersion(): int
    {
        return (int) Cache::get('cache_version', 0);
    }

    protected function bumpCache(): void
    {
        Cache::increment('cache_version');
    }
}