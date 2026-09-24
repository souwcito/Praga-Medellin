<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    protected $fillable = [
        'nombre',
        'nombre_interno',
        'descripcion',
        'precio',
        'precio_antes',
        'sku',
        'codigo_barras',
        'categoria_id',
        'subcategoria_id',
        'imagen_url',
        'imagenes',
    ];

    protected $casts = [
        'imagenes' => 'array',
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