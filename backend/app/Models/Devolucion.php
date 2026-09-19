<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Devolucion extends Model
{
    protected $fillable = [
        'venta_id',
        'sede_id',
        'empleado_id',
        'numero_interno',
        'tipo',
        'total_devuelto',
        'total_cambio',
        'diferencia',
        'metodo_pago',
        'motivo',
        'estado',
    ];

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function sede()
    {
        return $this->belongsTo(Sede::class);
    }

    public function empleado()
    {
        return $this->belongsTo(Empleado::class);
    }

    public function detalles()
    {
        return $this->hasMany(DetalleDevolucion::class);
    }
}