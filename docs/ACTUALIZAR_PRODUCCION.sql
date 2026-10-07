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

-- 9) Consecutivos race-safe (FAC-/DEV-) para varias cajas en paralelo.
--    El valor inicial se auto-ajusta al último número real usado + 1 la primera
--    vez que se genera un número, así que basta con crear la tabla.
CREATE TABLE IF NOT EXISTS `consecutivos` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo` VARCHAR(255) NOT NULL,
  `valor` BIGINT UNSIGNED NOT NULL DEFAULT 1001,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `consecutivos_tipo_unique` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10) Formas de pago por venta (POS): Efectivo, Banco, Addi, Sistecredito, Bold.
--     Una venta puede tener varias filas (pago dividido); la suma debe ser el total.
CREATE TABLE IF NOT EXISTS `pagos` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `venta_id` BIGINT UNSIGNED NOT NULL,
  `metodo_pago` VARCHAR(50) NOT NULL,
  `monto` INT NOT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `pagos_venta_id_foreign` (`venta_id`),
  CONSTRAINT `pagos_venta_id_foreign` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11) Descuento por línea de venta (precio final < estándar). El descuento está en pesos.
ALTER TABLE `detalle_ventas` ADD COLUMN `descuento` INT NOT NULL DEFAULT 0 AFTER `precio_unitario`;

-- 12) Panel del DUEÑO: costo por producto (cuánto le sale al dueño). Null = sin costo.
ALTER TABLE `productos` ADD COLUMN `costo` INT NULL AFTER `precio`;

-- 13) Usuario del dueño (rol 'dueno') para el panel del dueño.
--     Correo: oscar@pragamedellin.com · Contraseña: Oscar#2026 (hash bcrypt)
INSERT INTO `users` (`name`, `email`, `rol`, `password`, `created_at`, `updated_at`)
VALUES ('Oscar', 'oscar@pragamedellin.com', 'dueno', '$2y$10$vzg6IsVrz.RsBhKO/dYIUunxXIex3FVaJilfi.aRTPvuDaYJ5uQue', NOW(), NOW());

-- 14) Categoría CORREAS en el catálogo Hombre, con su subcategoría Premium 1.1.
--     Tallas OPCIONALES: el administrador decide si la correa es talla única o
--     le pone tallas libres (numéricas o en letras) al crearla en el panel.
INSERT INTO `categorias` (`catalogo`, `nombre`, `tallas`, `tallas_opcionales`, `created_at`, `updated_at`)
SELECT 'hombre', 'Correas', NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM (SELECT `id` FROM `categorias` WHERE `catalogo`='hombre' AND `nombre`='Correas') AS t
);

INSERT INTO `subcategorias` (`categoria_id`, `nombre`, `tallas`, `created_at`, `updated_at`)
SELECT `id`, 'Correas Premium 1.1', NULL, NOW(), NOW()
FROM `categorias`
WHERE `catalogo`='hombre' AND `nombre`='Correas'
AND NOT EXISTS (
  SELECT 1 FROM (SELECT `id` FROM `subcategorias` WHERE `nombre`='Correas Premium 1.1') AS t
);

-- 15) Vendedores: 'María Fernanda' → 'Miguel' (empleado id=2) y sede 'Praga Andalucía'
--     sin tilde (la í se veía como símbolo en el selector de vendedor). Se fija por
--     id para que funcione aunque el texto esté mal codificado. Oscar queda como
--     administrador que también factura (se muestra "Oscar Administrador").
UPDATE `empleados` SET `nombre` = 'Miguel' WHERE `id` = 2;
UPDATE `sedes` SET `nombre` = 'Praga Andalucia', `direccion` = 'Calle 107 # 47-27, Andalucia' WHERE `id` = 4;

INSERT INTO `empleados` (`nombre`, `rol`, `sede_id`, `created_at`, `updated_at`)
SELECT 'Oscar', 'administrador', 3, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM (SELECT `id` FROM `empleados` WHERE `nombre` = 'Oscar' AND `rol` = 'administrador') AS t
);

-- 16) Catálogo aparte "Fragancia Exclusiva" (fragancia de marca, no es un perfume).
--     Se agrega/edita como producto desde el panel eligiendo el catálogo "Fragancias"
--     y se muestra en la página pública /fragancia-exclusiva.
INSERT INTO `categorias` (`catalogo`, `nombre`, `tallas`, `created_at`, `updated_at`)
SELECT 'fragancia', 'Fragancia Exclusiva', NULL, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM (SELECT `id` FROM `categorias` WHERE `catalogo`='fragancia' AND `nombre`='Fragancia Exclusiva') AS t
);
-- =============================================================================