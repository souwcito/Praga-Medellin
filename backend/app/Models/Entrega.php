<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Entrega extends Model
{
    protected $fillable = [
        'numero',
        'cliente_id',
        'sede_id',
        'empleado_id',
        'direccion',
        'telefono',
        'nota',
        'total',
        'estado',
        'fecha_entrega',
        'facturada_at',
        'venta_id',
    ];

    protected $casts = [
        'fecha_entrega' => 'datetime',
        'facturada_at' => 'datetime',
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function sede()
    {
        return $this->belongsTo(Sede::class);
    }

    public function empleado()
    {
        return $this->belongsTo(Empleado::class);
    }

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function items()
    {
        return $this->hasMany(EntregaItem::class);
    }
}
