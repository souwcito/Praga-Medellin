<?php

namespace App\Http\Controllers;

use App\Models\Estilo;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EstiloController extends Controller
{
    public function index(Request $request)
    {
        $query = Estilo::orderBy('prenda')->orderBy('codigo');
        if ($request->filled('catalogo')) {
            $query->where('catalogo', $request->catalogo);
        }
        if ($request->filled('prenda')) {
            $query->where('prenda', $request->prenda);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $catalogo = $request->input('catalogo', 'hombre');
        $data = $request->validate([
            'prenda' => 'required|string|max:10',
            'codigo' => ['required', 'string', 'max:10'],
            'nombre' => 'required|string|max:255',
        ]);

        $existe = Estilo::where('catalogo', $catalogo)
            ->where('prenda', $data['prenda'])
            ->where('codigo', $data['codigo'])
            ->exists();
        if ($existe) {
            return response()->json(['error' => 'Ya existe un estilo con ese código para esa prenda.'], 422);
        }

        $data['catalogo'] = $catalogo;

        return response()->json(Estilo::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $estilo = Estilo::findOrFail($id);
        $catalogo = $request->input('catalogo', $estilo->catalogo);
        $data = $request->validate([
            'prenda' => 'required|string|max:10',
            'codigo' => ['required', 'string', 'max:10'],
            'nombre' => 'required|string|max:255',
        ]);

        $existe = Estilo::where('catalogo', $catalogo)
            ->where('prenda', $data['prenda'])
            ->where('codigo', $data['codigo'])
            ->where('id', '!=', $estilo->id)
            ->exists();
        if ($existe) {
            return response()->json(['error' => 'Ya existe un estilo con ese código para esa prenda.'], 422);
        }

        $data['catalogo'] = $catalogo;
        $estilo->update($data);

        return response()->json($estilo);
    }

    public function destroy($id)
    {
        Estilo::findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }
}
