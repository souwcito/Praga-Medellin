-- =============================================================================
-- Devoluciones / cambios: monto que entregó el cliente
--
-- Agrega la columna `monto_pagado` a `devoluciones`. Se usa cuando el cambio es
-- de mayor valor: guarda cuánto pagó el cliente y permite calcular el vuelto.
--
-- Ejecutar en phpMyAdmin: seleccionar la base de datos → pestaña SQL → pegar
-- todo → Continuar. Es seguro ejecutarlo más de una vez.
-- =============================================================================

SET @existe_columna := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'devoluciones'
    AND COLUMN_NAME = 'monto_pagado'
);

SET @sql := IF(
  @existe_columna = 0,
  'ALTER TABLE `devoluciones` ADD COLUMN `monto_pagado` int DEFAULT NULL AFTER `diferencia`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Marca la migración como ejecutada para que `php artisan migrate` no intente
-- agregar la columna otra vez.
INSERT INTO `migrations` (`migration`, `batch`)
SELECT
  '2026_10_31_000001_add_monto_pagado_to_devoluciones_table',
  COALESCE((SELECT MAX(`batch`) FROM `migrations`), 0) + 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `migrations`
  WHERE `migration` = '2026_10_31_000001_add_monto_pagado_to_devoluciones_table'
);

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'devoluciones'
  AND COLUMN_NAME = 'monto_pagado';
