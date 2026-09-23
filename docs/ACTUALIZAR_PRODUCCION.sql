-- =============================================================================
-- ACTUALIZACIÓN de producción (Hostinger) — phpMyAdmin → base u671432879_bd
-- Ejecutar en orden: 1) ALTER, 2) tallas. Es idempotente (se puede correr 2 veces).
-- =============================================================================

-- 1) Múltiples imágenes por producto: agrega la columna JSON 'imagenes'
--    (si la columna ya existe, este paso dará un aviso y se puede ignorar)
ALTER TABLE `productos` ADD COLUMN `imagenes` JSON NULL AFTER `imagen_url`;

-- 2) Tallas de ropa/prenda superior: cambiar la etiqueta XXL → 2XL (S, M, L, XL, 2XL)
UPDATE `subcategorias`
SET `tallas` = '["S","M","L","XL","2XL"]'
WHERE `tallas` = '["S","M","L","XL","XXL"]';

-- 3) Pantalonetas: XXL → 2XL
UPDATE `categorias`
SET `tallas` = '["L","M","XL","2XL"]'
WHERE `tallas` = '["L","M","XL","XXL"]';

-- Los jeans ya están en 30, 32, 34, 36, 38 (no requieren cambio).
-- Las tallas nuevas aplican a los productos que se creen desde ahora;
-- los productos existentes conservan sus variantes actuales.

-- 4) Categoría RELOJES en ambos catálogos con sus subcategorías
--    (talla única; Relojes de mujer ya existía como categoría)
INSERT INTO `categorias` (`catalogo`, `nombre`, `tallas`, `created_at`, `updated_at`)
VALUES ('hombre', 'Relojes', NULL, NOW(), NOW());

INSERT INTO `subcategorias` (`categoria_id`, `nombre`, `tallas`, `created_at`, `updated_at`)
SELECT `id`, 'Relojes Originales', NULL, NOW(), NOW() FROM `categorias` WHERE `catalogo`='hombre' AND `nombre`='Relojes';
INSERT INTO `subcategorias` (`categoria_id`, `nombre`, `tallas`, `created_at`, `updated_at`)
SELECT `id`, 'Relojes 1.1', NULL, NOW(), NOW() FROM `categorias` WHERE `catalogo`='hombre' AND `nombre`='Relojes';

INSERT INTO `subcategorias` (`categoria_id`, `nombre`, `tallas`, `created_at`, `updated_at`)
SELECT `id`, 'Relojes Originales', NULL, NOW(), NOW() FROM `categorias` WHERE `catalogo`='mujer' AND `nombre`='Relojes';
INSERT INTO `subcategorias` (`categoria_id`, `nombre`, `tallas`, `created_at`, `updated_at`)
SELECT `id`, 'Relojes 1.1', NULL, NOW(), NOW() FROM `categorias` WHERE `catalogo`='mujer' AND `nombre`='Relojes';
-- =============================================================================