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

-- 5) Nombre interno del producto (solo panel). El campo 'nombre' es el público.
ALTER TABLE `productos` ADD COLUMN `nombre_interno` VARCHAR(255) NULL AFTER `nombre`;

-- 6) Índices para rendimiento con cientos de productos
ALTER TABLE `inventarios` ADD INDEX `inv_variante_sede_idx` (`variante_id`, `sede_id`);
ALTER TABLE `ventas` ADD INDEX `ventas_created_at_idx` (`created_at`);
ALTER TABLE `devoluciones` ADD INDEX `devoluciones_created_at_idx` (`created_at`);

-- 7) Gorras: tallas OPCIONALES (talla única o con tallas, a elección del administrador)
ALTER TABLE `categorias` ADD COLUMN `tallas_opcionales` TINYINT(1) NOT NULL DEFAULT 0 AFTER `tallas`;
UPDATE `categorias` SET `tallas_opcionales` = 1 WHERE `nombre` = 'Gorras';
UPDATE `subcategorias` SET `tallas` = '["XS-S","M-L","XL"]'
WHERE `categoria_id` IN (SELECT `id` FROM `categorias` WHERE `nombre` = 'Gorras');

-- 8) Ofertas: precio anterior (tachado) + índice para el filtro en_oferta
ALTER TABLE `productos` ADD COLUMN `precio_antes` INT NULL AFTER `precio`;
ALTER TABLE `productos` ADD INDEX `productos_precio_antes_index` (`precio_antes`);
-- =============================================================================