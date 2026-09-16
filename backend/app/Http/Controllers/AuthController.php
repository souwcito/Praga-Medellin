<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // 1. Validar que el frontend nos envíe email y password
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        // 2. Buscar al usuario en la base de datos por su email
        $user = User::where('email', $request->email)->first();

        // 3. Verificar que el usuario exista y la contraseña sea correcta
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['error' => 'Credenciales incorrectas'], 401);
        }

        // 4. Generar el token de acceso seguro
        $token = $user->createToken('admin_panel_token')->plainTextToken;

        // 5. Devolver la estructura JSON exacta que pidió el socio
        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'nombre' => $user->name, // En nuestra migración se llama 'name'
                'email' => $user->email,
                'rol' => $user->rol
            ]
        ]);
    }
}