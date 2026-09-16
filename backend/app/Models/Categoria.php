<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Categoria extends Model
{
    protected $fillable = ['nombre', 'tallas'];

    protected $casts = [
        'tallas' => 'array',
    ];

    public function subcategorias()
    {
        return $this->hasMany(Subcategoria::class);
    }
}