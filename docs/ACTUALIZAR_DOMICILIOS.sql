-- =============================================================================
-- Módulo de DOMICILIOS CONTRA ENTREGA (entregas en prueba)
--
-- Crea las tablas nuevas. No modifica ninguna tabla existente, así que no
-- afecta ventas, inventario, Plan Separe ni comisiones.
--
-- Ejecutar en phpMyAdmin: seleccionar la base de datos → pestaña SQL → pegar
-- todo → Continuar. Usar charset utf8mb4.
--
-- IMPORTANTE: además de este SQL hay que subir el código actualizado del
-- backend y del panel (si no, el menú y la API de domicilios no existen).
-- =============================================================================

CREATE TABLE IF NOT EXISTS `entregas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `numero` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` bigint unsigned DEFAULT NULL,
  `sede_id` bigint unsigned NOT NULL,
  `empleado_id` bigint unsigned NOT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nota` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total` int NOT NULL DEFAULT 0,
  `estado` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `fecha_entrega` datetime DEFAULT NULL,
  `facturada_at` datetime DEFAULT NULL,
  `venta_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `entregas_numero_unique` (`numero`),
  KEY `entregas_cliente_id_foreign` (`cliente_id`),
  KEY `entregas_sede_id_foreign` (`sede_id`),
  KEY `entregas_empleado_id_foreign` (`empleado_id`),
  KEY `entregas_venta_id_foreign` (`venta_id`),
  KEY `entregas_estado_fecha_entrega_index` (`estado`, `fecha_entrega`),
  CONSTRAINT `entregas_cliente_id_foreign` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `entregas_sede_id_foreign` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`id`),
  CONSTRAINT `entregas_empleado_id_foreign` FOREIGN KEY (`empleado_id`) REFERENCES `empleados` (`id`),
  CONSTRAINT `entregas_venta_id_foreign` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `entrega_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entrega_id` bigint unsigned NOT NULL,
  `variante_id` bigint unsigned NOT NULL,
  `sede_origen_id` bigint unsigned DEFAULT NULL,
  `cantidad` int NOT NULL,
  `cantidad_facturada` int DEFAULT NULL,
  `precio_unitario` int NOT NULL,
  `subtotal` int NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `entrega_items_entrega_id_foreign` (`entrega_id`),
  KEY `entrega_items_variante_id_foreign` (`variante_id`),
  KEY `entrega_items_sede_origen_id_foreign` (`sede_origen_id`),
  CONSTRAINT `entrega_items_entrega_id_foreign` FOREIGN KEY (`entrega_id`) REFERENCES `entregas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `entrega_items_variante_id_foreign` FOREIGN KEY (`variante_id`) REFERENCES `variantes` (`id`),
  CONSTRAINT `entrega_items_sede_origen_id_foreign` FOREIGN KEY (`sede_origen_id`) REFERENCES `sedes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificación: deben existir las dos tablas y quedar vacías.
SELECT COUNT(*) AS entregas FROM `entregas`;
SELECT COUNT(*) AS entrega_items FROM `entrega_items`;

-- Marca la migración como ejecutada. Así, si algún día se corre
-- `php artisan migrate`, no intentará crear estas tablas otra vez.
INSERT INTO `migrations` (`migration`, `batch`)
SELECT
  '2026_10_27_000001_create_entregas_tables',
  COALESCE((SELECT MAX(`batch`) FROM `migrations`), 0) + 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `migrations`
  WHERE `migration` = '2026_10_27_000001_create_entregas_tables'
);
