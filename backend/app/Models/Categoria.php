<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Categoria extends Model
{
    protected $fillable = ['nombre', 'tallas', 'catalogo', 'tallas_opcionales'];

    protected $casts = [
        'tallas' => 'array',
        'tallas_opcionales' => 'boolean',
    ];

    public function subcategorias()
    {
        return $this->hasMany(Subcategoria::class);
    }
}