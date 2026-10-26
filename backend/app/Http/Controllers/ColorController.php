<?php

namespace App\Http\Controllers;

use App\Models\Color;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ColorController extends Controller
{
    public function index(Request $request)
    {
        $query = Color::orderBy('codigo');
        if ($request->filled('catalogo')) {
            $query->where('catalogo', $request->catalogo);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $catalogo = $request->input('catalogo', 'hombre');
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:10', Rule::unique('colores')->where('catalogo', $catalogo)],
            'nombre' => 'required|string|max:255',
        ]);
        $data['catalogo'] = $catalogo;

        return response()->json(Color::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $color = Color::findOrFail($id);
        $catalogo = $request->input('catalogo', $color->catalogo);
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:10', Rule::unique('colores')->where('catalogo', $catalogo)->ignore($color->id)],
            'nombre' => 'required|string|max:255',
        ]);
        $data['catalogo'] = $catalogo;
        $color->update($data);

        return response()->json($color);
    }

    public function destroy($id)
    {
        Color::findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }
}
