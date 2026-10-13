<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetalleDevolucion extends Model
{
    // Coincide con la tabla real creada en las migraciones ("detalle_devoluciones").
    protected $table = 'detalle_devoluciones';

    protected $fillable = ['devolucion_id', 'variante_id', 'cantidad', 'precio_unitario', 'tipo'];

    public function devolucion()
    {
        return $this->belongsTo(Devolucion::class);
    }

    public function variante()
    {
        return $this->belongsTo(Variante::class);
    }
}