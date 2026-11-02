<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EntregaItem extends Model
{
    protected $fillable = [
        'entrega_id',
        'variante_id',
        'sede_origen_id',
        'cantidad',
        'cantidad_facturada',
        'precio_unitario',
        'subtotal',
    ];

    public function entrega()
    {
        return $this->belongsTo(Entrega::class);
    }

    public function variante()
    {
        return $this->belongsTo(Variante::class);
    }

    public function sedeOrigen()
    {
        return $this->belongsTo(Sede::class, 'sede_origen_id');
    }
}
