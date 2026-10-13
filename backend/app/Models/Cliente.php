<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    protected $fillable = ['nombre', 'documento', 'email', 'telefono', 'direccion', 'ciudad'];

    public function pedidos()
    {
        return $this->hasMany(Pedido::class);
    }

    public function apartados()
    {
        return $this->hasMany(Apartado::class);
    }
}