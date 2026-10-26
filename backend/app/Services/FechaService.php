<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Cálculos de fecha basados en la zona horaria del negocio (Colombia).
 *
 * Los timestamps se guardan y se leen en UTC (config/app.php -> 'timezone' => 'UTC'),
 * pero los límites de "hoy / semana / mes" deben calcularse en hora de Medellín
 * (America/Bogota, UTC-5). Esto evita que, por ejemplo, a las 8:00 p.m. de Colombia
 * (ya 1:00 a.m. del día siguiente en UTC) el filtro "Día" apunte al día equivocado.
 */
class FechaService
{
    public const ZONA = 'America/Bogota';

    /**
     * Inicio del periodo en hora local de Colombia, convertido a UTC para
     * compararlo directamente con las columnas created_at (almacenadas en UTC).
     */
    public static function inicioPeriodo(string $periodo): Carbon
    {
        $dias = $periodo === 'dia' ? 0 : ($periodo === 'semana' ? 6 : 29);
        return now(self::ZONA)->startOfDay()->subDays($dias)->utc();
    }

    /**
     * Día local (inicio de jornada, 00:00 hora de Colombia) desplazado N días
     * hacia atrás. Útil para agrupar ventas por fecha local.
     */
    public static function diaLocal(int $desplazamiento = 0): Carbon
    {
        return now(self::ZONA)->startOfDay()->subDays($desplazamiento);
    }

    /**
     * Rango UTC [inicio, fin] de un día local de Colombia.
     * Se usa para filtrar created_at sin cortar las ventas de la noche.
     */
    public static function rangoDiaLocal(string $fecha): array
    {
        $inicio = Carbon::parse($fecha, self::ZONA)->startOfDay()->utc();
        $fin = $inicio->copy()->setTimezone(self::ZONA)->endOfDay()->utc();

        return [$inicio, $fin];
    }
}
