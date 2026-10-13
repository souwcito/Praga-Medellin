<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Apartado extends Model
{
    protected $fillable = [
        'numero_interno',
        'cliente_id',
        'sede_id',
        'empleado_id',
        'total',
        'abonado',
        'estado',
        'venta_id',
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
        return $this->hasMany(ApartadoItem::class);
    }

    public function abonos()
    {
        return $this->hasMany(Abono::class);
    }
}