<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    protected $fillable = ['nombre', 'email', 'telefono', 'direccion', 'ciudad'];

    public function pedidos()
    {
        return $this->hasMany(Pedido::class);
    }
}