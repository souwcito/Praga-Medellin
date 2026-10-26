<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pedido extends Model
{
    protected $fillable = [
        'numero',
        'cliente_id',
        'total',
        'subtotal',
        'descuento',
        'recompensas',
        'factura_numero',
        'referencia',
        'wompi_transaction_id',
        'metodo_pago',
        'franquicia',
        'payment_status',
        'estado',
        'items',
        'tomado_por',
        'tomado_at',
    ];

    protected $casts = [
        'items' => 'array',
        'recompensas' => 'array',
        'tomado_at' => 'datetime',
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }
}