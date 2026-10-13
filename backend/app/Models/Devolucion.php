<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Devolucion extends Model
{
    // El plural correcto es "devoluciones" (el automático de Laravel lo deja en
    // "devolucions"); debe coincidir con la tabla creada en las migraciones.
    protected $table = 'devoluciones';

    protected $fillable = [
        'venta_id',
        'sede_id',
        'sede_cambio_id',
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

    // Sede de la que salen los productos del cambio (puede ser null = misma sede)
    public function sedeCambio()
    {
        return $this->belongsTo(Sede::class, 'sede_cambio_id');
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