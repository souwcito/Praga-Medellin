<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetalleDevolucion extends Model
{
    protected $fillable = ['devolucion_id', 'variante_id', 'cantidad', 'precio_unitario', 'tipo'];

    public function devolucion()
    {
        return $this->belongsTo(Devolucion::class);
    }

    public function variante()
    {
        return $this->belongsTo(Variante::class);
    }
}