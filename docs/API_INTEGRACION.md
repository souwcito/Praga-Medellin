# Integración Frontend ↔ Backend — Praga Medellín

Documento de contrato entre el backend (Laravel, socio A) y los frontends
(`frontend-panel` y `frontend-tienda`). Servirá para alinear los endpoints y
el modelo de datos antes de conectar todo.

## 1. Estado actual (rama develop, commit 51c95ed)

Backend Laravel 12 + Sanctum, probado en local con SQLite en `127.0.0.1:8000`.

### Endpoints implementados y verificado su funcionamiento

| Método | Ruta | Respuesta | Estado |
|---|---|---|---|
| POST | `/api/login` | `{ token, user: { id, nombre, email, rol } }` | ✅ |
| GET | `/api/sedes` | `[{ id, nombre, direccion }]` | ✅ |
| GET | `/api/empleados` | `[{ id, nombre, rol, sede_id, sede_nombre }]` | ✅ |
| GET | `/api/inventario?sede_id=X` | `[{ producto_id, nombre, precio, sku, codigo_barras, imagen_url, stock }]` | ✅ |
| POST | `/api/ventas` | `{ mensaje, numero_interno, total }` | ✅ |

- Credenciales de prueba: **admin@pragamedellin.com / admin123** (rol admin).
- Login con credenciales incorrectas → `401`.
- Los seeders `ProductoSeeder`, `EmpleadoSeeder` e `InventarioSeeder` están **vacíos**.
  Se sembraron datos locales de prueba en la BD (sin commit) para validar el flujo.

### Diferencias clave con los frontends

- El backend actual modela el inventario **por producto** (sin tallas).
- Los frontends evolucionaron al modelo de **VARIANTES**: producto + talla,
  cada variante con su **código de barras único** e inventario por variante y sede.
- El POS envía `items: [{ variante_id, cantidad, precio_unitario }]`; el backend
  actual espera `detalles: [{ producto_id, cantidad, precio_unitario }]`.
  **Esto impide conectar el POS directamente hasta que el backend use variantes.**

## 2. Contrato que esperan los frontends

### 2.1 frontend-panel (login cuenta única + POS + gestión)

- `POST /api/login` → `{ token, user: { id, nombre, email, rol, sede_id?, sede_nombre? } }`
- `GET /api/sedes` → `[{ id, nombre, direccion }]`
- `GET /api/empleados` → `[{ id, nombre, rol, sede_id, sede_nombre }]`
- `GET /api/categorias` → `[{ id, nombre, tallas: [] }]`
- `GET /api/subcategorias` → `[{ id, categoria_id, nombre, tallas: [] }]`
- `GET /api/productos` → `[{ id, nombre, descripcion, precio, sku, categoria_id, subcategoria_id, imagen_url, variantes: [{ id, talla, codigo_barras, stock_total }] }]`
- `POST /api/productos` y `PUT/DELETE /api/productos/{id}` (aceptan `variantes: [{ talla, codigo_barras, stock_inicial }]`)
- `GET /api/inventario?sede_id=X` → variantes con stock > 0:
  `[{ variante_id, producto_id, nombre, talla, precio, sku, codigo_barras, imagen_url, stock }]`
- `GET /api/inventario/completo` → matriz variante × sede:
  `[{ variante_id, producto_id, nombre, talla, sku, codigo_barras, imagen_url, stock: [{ sede_id, sede, cantidad }] }]`
- `POST /api/inventario/ajustes` → `{ variante_id, sede_id, tipo: entrada|salida, cantidad, motivo? }`
- `POST /api/ventas` → `{ empleado_id, sede_venta_id, tipo, items: [{ variante_id, cantidad, precio_unitario }] }`
  → respuesta `{ venta, factura: { numero_interno }, items, sede, vendedor, total }`
- `GET /api/ventas?periodo=&sede_id=&empleado_id=&tipo=&page=&per_page=` → `{ data: [...], meta: { total, per_page, current_page, last_page }, resumen: { totalVendido } }`
- `GET /api/dashboard?periodo=dia|semana|mes` →
  `{ total, numVentas, ticketPromedio, totalPorSede[], productosMasVendidos[], empleadoDestacado, ventasPorDia[] }`
- `GET /api/comisiones?periodo=&sede_id=` → `[{ empleado_id, nombre, sede_id, sede, total, numVentas, ventas: [{ venta_id, fecha, sede_venta_id, tipo, total, factura }] }]`
- `POST /api/imagenes` (multipart, campo `imagen`) → `{ imagen_url }`

### 2.2 frontend-tienda (público)

- `GET /api/categorias` y `GET /api/subcategorias`
- `GET /api/productos` y `GET /api/productos/{id}` (público, con variantes y stock)
- `POST /api/pedidos` → `{ items, cliente, total }`

## 3. Modelo de datos a agregar en el backend (variantes / tallas)

- **categorias**: `id, nombre, tallas` (JSON o relacionadas)
- **subcategorias**: `id, categoria_id, nombre, tallas`
- **variantes**: `id, producto_id, talla (nullable), codigo_barras (unique)`
- **inventarios**: pasar a `variante_id, sede_id, stock` (en vez de producto_id)
- **detalle_ventas**: usar `variante_id` (en vez de producto_id)
- **facturas** (internas, no DIAN): `venta_id, numero_interno, fecha`

Las tallas van como **seed** en la BD (categoría → subcategoría → tallas). Ejemplos:
ropa `S–XXL`; tenis `7-40 … 11-44`; jeans `30–38`; bolsos/gorras/perfumes sin talla.

## 4. Cómo correr el backend en local

```bash
cd backend
# PHP de XAMPP (si no está en el PATH):
C:\xampp\php\php.exe C:\xampp\php\composer.phar install
C:\xampp\php\php.exe artisan key:generate
C:\xampp\php\php.exe artisan migrate --seed
C:\xampp\php\php.exe artisan serve --port=8000   # http://127.0.0.1:8000
```

- BD usada para pruebas: **SQLite** (`database/database.sqlite`).
- CORS ya abierto (`config/cors.php` → `allowed_origins: ['*']`).

## 5. Cómo conectar los frontends al backend real

En `.env` de cada frontend (NO commiteado):

```env
VITE_USE_MOCK=false
VITE_API_URL=http://127.0.0.1:8000/api
```

En `frontend-tienda` agregar además `VITE_WOMPI_PUBLIC_KEY=...` (checkout).

> Mientras el backend no tenga los endpoints y el modelo de variantes,
> los frontends se usan con `VITE_USE_MOCK=true` (datos simulados).