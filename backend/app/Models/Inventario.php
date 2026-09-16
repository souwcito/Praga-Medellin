<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Inventario extends Model
{
    protected $fillable = ['variante_id', 'sede_id', 'stock'];

    public function variante()
    {
        return $this->belongsTo(Variante::class);
    }

    public function sede()
    {
        return $this->belongsTo(Sede::class);
    }
}