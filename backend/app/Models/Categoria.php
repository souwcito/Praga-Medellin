<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Categoria extends Model
{
    protected $fillable = ['nombre', 'tallas', 'catalogo', 'tallas_opcionales', 'portada_producto_id'];

    protected $casts = [
        'tallas' => 'array',
        'tallas_opcionales' => 'boolean',
    ];

    public function subcategorias()
    {
        return $this->hasMany(Subcategoria::class);
    }

    // Producto elegido como portada de la categoría en la tienda pública.
    public function portada()
    {
        return $this->belongsTo(Producto::class, 'portada_producto_id');
    }
}