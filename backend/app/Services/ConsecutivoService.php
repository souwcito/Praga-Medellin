<?php

namespace App\Services;

use App\Models\Consecutivo;
use App\Models\Devolucion;
use App\Models\Venta;
use Illuminate\Support\Facades\DB;

class ConsecutivoService
{
    public const INICIAL = 1001;

    /**
     * Devuelve el siguiente número de un tipo de consecutivo de forma atómica
     * (bloquea la fila con lockForUpdate dentro de una transacción, evitando
     * colisiones cuando varias cajas registran ventas/devoluciones a la vez).
     * Si el tipo no existe aún, lo crea a partir del último número real usado
     * (FAC-/DEV-) + 1 para no chocar con los registros existentes.
     */
    public static function siguiente(string $tipo): int
    {
        return DB::transaction(function () use ($tipo) {
            $reg = Consecutivo::where('tipo', $tipo)->lockForUpdate()->first();

            if (!$reg) {
                $actual = self::ultimoUsado($tipo);
                $reg = Consecutivo::create(['tipo' => $tipo, 'valor' => max(self::INICIAL, $actual + 1)]);
            }

            $valor = (int) $reg->valor;
            $reg->increment('valor');

            return $valor;
        });
    }

    private static function ultimoUsado(string $tipo): int
    {
        if ($tipo === 'factura') {
            return (int) Venta::query()
                ->where('numero_interno', 'like', 'FAC-%')
                ->max(DB::raw('CAST(SUBSTRING(numero_interno, 5) AS UNSIGNED)'));
        }
        if ($tipo === 'devolucion') {
            return (int) Devolucion::query()
                ->where('numero_interno', 'like', 'DEV-%')
                ->max(DB::raw('CAST(SUBSTRING(numero_interno, 5) AS UNSIGNED)'));
        }

        return 0;
    }
}