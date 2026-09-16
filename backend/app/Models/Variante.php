<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Variante extends Model
{
    protected $fillable = ['producto_id', 'talla', 'codigo_barras'];

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    public function inventarios()
    {
        return $this->hasMany(Inventario::class);
    }
}