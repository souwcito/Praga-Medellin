<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetalleVenta extends Model
{
    protected $fillable = ['venta_id', 'variante_id', 'cantidad', 'precio_unitario', 'subtotal'];

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function variante()
    {
        return $this->belongsTo(Variante::class);
    }
}