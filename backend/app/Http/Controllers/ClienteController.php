<?php

namespace App\Http\Controllers;

use App\Models\Cliente;

class ClienteController extends Controller
{
    public function index()
    {
        return response()->json(
            Cliente::orderByDesc('id')->get()
        );
    }
}