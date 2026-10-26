<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Estilo extends Model
{
    protected $table = 'estilos';

    protected $fillable = ['catalogo', 'prenda', 'codigo', 'nombre'];
}
