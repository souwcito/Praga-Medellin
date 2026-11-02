-- =============================================================================
-- Reemplazo de vendedores (POS / facturación)
--   Michael  → María José
--   Bibiana  → Paulina
--   Sara     → Camila
--
-- Se renombran los registros existentes para conservar los IDs y no romper el
-- historial de ventas, devoluciones, apartados y abonos (empleado_id).
--
-- Ejecutar con charset utf8mb4 para que las tildes no se dañen:
--   mysql --default-character-set=utf8mb4 -u USUARIO -p BASE_DE_DATOS < ACTUALIZAR_VENDEDORES.sql
-- =============================================================================

UPDATE `empleados` SET `nombre` = 'María José', `updated_at` = NOW()
WHERE `nombre` = 'Michael' AND `rol` = 'cajero';

UPDATE `empleados` SET `nombre` = 'Paulina', `updated_at` = NOW()
WHERE `nombre` = 'Bibiana' AND `rol` = 'cajero';

UPDATE `empleados` SET `nombre` = 'Camila', `updated_at` = NOW()
WHERE `nombre` = 'Sara' AND `rol` = 'cajero';

-- Verificación: deben aparecer los tres nuevos vendedores y ninguno de los anteriores.
SELECT `id`, `nombre`, `rol`, `sede_id` FROM `empleados` ORDER BY `id`;
