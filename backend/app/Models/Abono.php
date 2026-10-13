<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Abono extends Model
{
    protected $fillable = ['apartado_id', 'monto', 'metodo_pago', 'empleado_id'];

    public function apartado()
    {
        return $this->belongsTo(Apartado::class);
    }

    public function empleado()
    {
        return $this->belongsTo(Empleado::class);
    }
}