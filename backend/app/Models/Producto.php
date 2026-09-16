<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    protected $fillable = [
        'nombre',
        'descripcion',
        'precio',
        'sku',
        'codigo_barras',
        'categoria_id',
        'subcategoria_id',
        'imagen_url',
    ];

    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
    }

    public function subcategoria()
    {
        return $this->belongsTo(Subcategoria::class);
    }

    public function variantes()
    {
        return $this->hasMany(Variante::class);
    }
}