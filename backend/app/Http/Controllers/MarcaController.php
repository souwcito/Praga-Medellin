<?php

namespace App\Http\Controllers;

use App\Models\Marca;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MarcaController extends Controller
{
    public function index(Request $request)
    {
        $query = Marca::orderBy('codigo');
        if ($request->filled('catalogo')) {
            $query->where('catalogo', $request->catalogo);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $catalogo = $request->input('catalogo', 'hombre');
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:10', Rule::unique('marcas')->where('catalogo', $catalogo)],
            'nombre' => 'required|string|max:255',
        ]);
        $data['catalogo'] = $catalogo;

        return response()->json(Marca::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $marca = Marca::findOrFail($id);
        $catalogo = $request->input('catalogo', $marca->catalogo);
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:10', Rule::unique('marcas')->where('catalogo', $catalogo)->ignore($marca->id)],
            'nombre' => 'required|string|max:255',
        ]);
        $data['catalogo'] = $catalogo;
        $marca->update($data);

        return response()->json($marca);
    }

    public function destroy($id)
    {
        Marca::findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }
}
