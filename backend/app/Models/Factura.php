<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Factura extends Model
{
    protected $fillable = ['venta_id', 'numero_interno', 'fecha'];

    protected $casts = [
        'fecha' => 'datetime',
    ];

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }
}