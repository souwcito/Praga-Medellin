<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Verifica que el usuario autenticado tenga el rol indicado (ej. role:dueno).
class EnsureRole
{
    public function handle(Request $request, Closure $next, string $rol): Response
    {
        $user = $request->user();
        if (!$user || $user->rol !== $rol) {
            abort(403, 'No tienes permisos para acceder a este recurso.');
        }
        return $next($request);
    }
}