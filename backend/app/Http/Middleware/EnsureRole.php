<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Verifica que el usuario autenticado tenga uno de los roles indicados
// (separados por coma, ej. role:admin,dueno o role:dueno).
class EnsureRole
{
    public function handle(Request $request, Closure $next, string $roles): Response
    {
        $user = $request->user();
        $permitidos = array_filter(array_map('trim', explode(',', $roles)));
        // trim también el rol del usuario por si la BD lo guardó con espacios.
        $rol = $user ? trim((string) $user->rol) : null;
        if (!$user || !in_array($rol, $permitidos, true)) {
            abort(403, 'No tienes permisos para acceder a este recurso.');
        }
        return $next($request);
    }
}