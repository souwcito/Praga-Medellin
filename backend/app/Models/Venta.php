<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Venta extends Model
{
    protected $fillable = ['empleado_id', 'sede_venta_id', 'tipo', 'numero_interno', 'total'];

    public function empleado()
    {
        return $this->belongsTo(Empleado::class);
    }

    public function sedeVenta()
    {
        return $this->belongsTo(Sede::class, 'sede_venta_id');
    }

    public function factura()
    {
        return $this->hasOne(Factura::class);
    }

    public function detalles()
    {
        return $this->hasMany(DetalleVenta::class);
    }
}