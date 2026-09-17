<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pedido extends Model
{
    protected $fillable = ['numero', 'cliente_id', 'total', 'estado', 'items'];

    protected $casts = [
        'items' => 'array',
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }
}