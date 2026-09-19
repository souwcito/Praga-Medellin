# Despliegue en Hostinger — pragamedellin.com

Guía paso a paso para subir a producción. Todo se sirve bajo un solo dominio:

| Ruta | Qué es |
|---|---|
| `pragamedellin.com/` | Tienda pública (React/Vite) |
| `pragamedellin.com/panel` | Panel admin |
| `pragamedellin.com/api/*` | Backend Laravel (en `public_html/api-app/`) |
| `pragamedellin.com/images/*` | Imágenes de productos subidas desde el panel |

---

## 0. Requisitos
- Dominio `pragamedellin.com` conectado a Hostinger (si está en otro registrador, apunta los **nameservers** a Hostinger en hPanel).
- Plan de Hostinger con **hPanel + FTP** (y MySQL).
- En tu PC: FTP (FileZilla), y los builds ya generados en:
  - `frontend-tienda/dist/`
  - `frontend-panel/dist/`
  - `backend/` completo (con `vendor/`)
  - `backend/produccion.sql`

---

## 1. En hPanel (Hostinger)

1. **Base de datos**: hPanel → Databases → MySQL → crear base con usuario y contraseña.
   Anota: `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`.
   Credenciales actuales del proyecto:
   ```env
   DB_DATABASE=u671432879_bd
   DB_USERNAME=u671432879_praga
   DB_PASSWORD=Praga+1999
   ```
2. **SSL**: hPanel → SSL → activar certificado gratuito para `pragamedellin.com`.
3. **Importar datos**: phpMyAdmin (hPanel) → seleccionar la base `u671432879_bd` → *Import* → subir `backend/produccion.sql`. Esto crea tablas (incluye **devoluciones**), catálogo, sedes, categorías y el usuario admin.
   > El dump importa en la base **seleccionada** (no crea una base propia), así que asegúrate de tener `u671432879_bd` seleccionada en phpMyAdmin antes de importar.

---

## 2. Estructura de carpetas en `public_html/` (por FTP)

```
public_html/
├── .htaccess            ← el de frontend-tienda/dist/.htaccess (combinado)
├── index.html           ← de frontend-tienda/dist/
├── assets/              ← de frontend-tienda/dist/assets/
├── images/              ← de frontend-tienda/dist/images/ (respaldo, opcional)
├── favicon.png
├── robots.txt
├── sitemap.xml
├── panel/               ← TODO el contenido de frontend-panel/dist/
│   ├── .htaccess
│   ├── index.html
│   └── assets/
└── api-app/             ← TODO el contenido de backend/ (Laravel)
    ├── .env             ← crear desde .env.production y completar la BD
    ├── public/
    ├── app/
    ├── routes/
    ├── vendor/
    ├── storage/
    └── bootstrap/
```

> **Importante**: sube el **contenido** de `dist/` (no la carpeta `dist/`), y el **contenido** de `backend/` (no `backend/produccion.sql` dentro de api-app; ese archivo es solo para importar).

---

## 3. Configurar la API (`api-app/.env`)

1. En tu PC: copia `backend/.env.production` y renómbralo a `.env` (o súbelo como `.env`).
2. Completa las credenciales de la base creada en el paso 1:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=u671432879_bd
   DB_USERNAME=u671432879_praga
   DB_PASSWORD=Praga+1999
   ```
3. Verifica que `APP_KEY` esté presente (ya viene generada en `.env.production`).
4. Sube el archivo a `public_html/api-app/.env`.

> El `APP_KEY` ya está generado; **no lo cambies** o los datos cifrados (tokens) se invalidan.

---

## 4. Permisos (hPanel → File Manager)

Selecciona `api-app` → *Permissions* y pon:
- `storage` y `storage/framework/{cache,sessions,views,testing}` → **755**
- `bootstrap/cache` → **755**
- Archivos `.php` → **644**

Esto es necesario para que Laravel escriba logs, sesiones y caché.

---

## 5. Verificación final

| Prueba | Resultado esperado |
|---|---|
| `https://pragamedellin.com/` | Tienda cargando (layout + catálogo) |
| `https://pragamedellin.com/catalogo` | Catálogo (y al recargar no rompe assets) |
| `https://pragamedellin.com/producto/1` | Detalle de producto (recarga OK) |
| `https://pragamedellin.com/api/sedes` | JSON con las sedes |
| `https://pragamedellin.com/api/login` | Login del panel (POST con admin@pragamedellin.com / admin123) |
| `https://pragamedellin.com/panel` | Login del panel admin |
| `https://pragamedellin.com/sitemap.xml` | Sitemap (se regenera en cada build) |
| `https://pragamedellin.com/robots.txt` | Permite indexar + referencia al sitemap |

Si la API responde 500: revisa `api-app/storage/logs/laravel.log`.

---

## 6. Publicar cambios futuros (cada actualización)

1. `cd frontend-tienda && npm run build` → subir `dist/` a la raíz de `public_html` (sobrescribir).
2. `cd frontend-panel && npm run build` → subir `dist/` a `public_html/panel/`.
3. Backend: subir solo los archivos PHP modificados.
4. Cambios en BD (migraciones nuevas): generarlas y actualizar el dump, o ejecutar las queries nuevas en phpMyAdmin.

---

## 7. SEO — Google Search Console y Analytics

1. **Search Console**: descomenta la línea del `index.html` de la tienda
   (`<meta name="google-site-verification" ...>`) y pega tu código de verificación, o verifica por DNS.
   Luego envía `https://pragamedellin.com/sitemap.xml`.
2. **GA4**: en `index.html` reemplaza `G-XXXXXXXXXX` por tu ID de medición.
3. **Google Business Profile**: crea una ficha por sede (Andalucía, Aranjuez, Akron Castilla, Praga Woman) con el mismo nombre/dirección/teléfono del sitio.
4. El `sitemap.xml` se genera automáticamente en cada `npm run build` consultando la API (incluye todos los productos). Si la API no responde durante el build, genera solo las URLs estáticas.

---

## Notas
- **Wompi**: el checkout de la tienda todavía es un placeholder; cuando se integre, completa `VITE_WOMPI_PUBLIC_KEY` en `frontend-tienda/.env.production` y reconstruye.
- El `.htaccess` raíz redirige HTTP→HTTPS, rutea `/api` y `/images` hacia Laravel, deja `/panel` a su propio SPA y agrega caché/compresión para rendimiento (Core Web Vitals).
- El panel no se indexa (`X-Robots-Tag: noindex`).