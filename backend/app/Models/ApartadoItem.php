<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApartadoItem extends Model
{
    protected $fillable = ['apartado_id', 'variante_id', 'cantidad', 'precio_unitario', 'subtotal'];

    public function apartado()
    {
        return $this->belongsTo(Apartado::class);
    }

    public function variante()
    {
        return $this->belongsTo(Variante::class);
    }
}