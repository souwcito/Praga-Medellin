-- =============================================================================
-- Agregar vendedores: Bibiana y Maicol
--
-- Ejecutar en phpMyAdmin, en la base de producción (u671432879_bd):
--   seleccionar la base → pestaña SQL → pegar todo → Continuar.
--
-- Si van en otra sede, cambia solo estas dos líneas antes de ejecutar.
-- =============================================================================

SET @sede_bibiana := COALESCE(
  (SELECT id FROM `sedes` WHERE `nombre` LIKE 'Praga Andaluc%' ORDER BY id LIMIT 1),
  (SELECT id FROM `sedes` WHERE `nombre` <> 'Online' ORDER BY id LIMIT 1)
);

SET @sede_maicol := COALESCE(
  (SELECT id FROM `sedes` WHERE `nombre` LIKE 'Praga Aranjuez%' ORDER BY id LIMIT 1),
  (SELECT id FROM `sedes` WHERE `nombre` <> 'Online' ORDER BY id LIMIT 1)
);

-- Bibiana (no se duplica si ya existe).
INSERT INTO `empleados` (`nombre`, `rol`, `sede_id`, `created_at`, `updated_at`)
SELECT 'Bibiana', 'cajero', @sede_bibiana, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `empleados` WHERE `nombre` = 'Bibiana'
);

-- Maicol (no se duplica si ya existe).
INSERT INTO `empleados` (`nombre`, `rol`, `sede_id`, `created_at`, `updated_at`)
SELECT 'Maicol', 'cajero', @sede_maicol, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `empleados` WHERE `nombre` = 'Maicol'
);

-- Verificación
SELECT `id`, `nombre`, `rol`, `sede_id`
FROM `empleados`
WHERE `nombre` IN ('Bibiana', 'Maicol');
