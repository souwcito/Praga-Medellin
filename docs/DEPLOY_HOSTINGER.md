# Despliegue en Hostinger — pragamedellin.com

> **IMPORTANTE (SSL):** para que el sitio funcione, el certificado SSL de
> `pragamedellin.com` debe estar **activo** en Hostinger. Mientras no esté emitido,
> HTTPS falla (el `.htaccess` redirige HTTP→HTTPS) y el dominio se ve caído.
> Actívalo en hPanel → **SSL** → *Instalar certificado* para `pragamedellin.com`
> (gratuito, Let's Encrypt), espera a que se emita y verifica en un navegador.

Guía paso a paso para producción. Todo se sirve bajo un solo dominio:

| Ruta | Qué es |
|---|---|
| `https://pragamedellin.com/` | Tienda pública (React/Vite, prerenderizada para SEO) |
| `https://pragamedellin.com/panel` | Panel admin |
| `https://pragamedellin.com/api/*` | Backend Laravel (en `public_html/api-app/`) |
| `https://pragamedellin.com/images/*` | Imágenes de productos subidas desde el panel |

---

## 0. Requisitos
- Dominio `pragamedellin.com` conectado a Hostinger con **SSL activo**.
- Plan de Hostinger con **hPanel + FTP** (y MySQL).
- En tu PC: FTP (FileZilla), y los builds ya generados en:
  - `frontend-tienda/dist/`
  - `frontend-panel/dist/`
  - `backend/` completo (con `vendor/`)
  - `backend/produccion.sql`

---

## 1. En hPanel (Hostinger)

1. **Base de datos**: hPanel → Databases → MySQL → crear base con usuario y contraseña.
   Credenciales actuales del proyecto:
   ```env
   DB_DATABASE=u671432879_bd
   DB_USERNAME=u671432879_praga
   DB_PASSWORD=Praga+1999
   ```
2. **SSL**: hPanel → SSL → instalar el certificado gratuito para `pragamedellin.com`
   (¡sin esto el sitio no carga!).
3. **Importar datos**: phpMyAdmin (hPanel) → seleccionar la base `u671432879_bd`
   → *Import* → subir `backend/produccion.sql`. Esto crea tablas (incluye
   **devoluciones**), catálogo, sedes, categorías y el usuario admin.
   > El dump importa en la base **seleccionada** (no crea una base propia).

---

## 2. Estructura de carpetas en `public_html/` (por FTP)

```
public_html/
├── .htaccess            ← el de frontend-tienda/dist/.htaccess (combinado)
├── index.html           ← de frontend-tienda/dist/
├── assets/              ← de frontend-tienda/dist/assets/
├── og-image.png         ← imagen social (1200×630) del SEO
├── favicon.png
├── robots.txt
├── sitemap.xml
├── producto/            ← HTML prerenderizado por producto (SEO)
│   └── <id>/index.html
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

> **Importante**: sube el **contenido** de `dist/` (no la carpeta `dist/`), y el
> **contenido** de `backend/` (no `backend/produccion.sql` dentro de api-app).

---

## 3. Configurar la API (`api-app/.env`)

1. En tu PC: copia `backend/.env.production` y renómbralo a `.env`.
2. Verifica las credenciales de la base:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=u671432879_bd
   DB_USERNAME=u671432879_praga
   DB_PASSWORD=Praga+1999
   APP_URL=https://pragamedellin.com
   ```
3. Sube el archivo a `public_html/api-app/.env`.

> El `APP_KEY` ya viene generado en `.env.production`; **no lo cambies**.

---

## 4. Permisos (hPanel → File Manager)

Selecciona `api-app` → *Permissions*:
- `storage` y `storage/framework/{cache,sessions,views,testing}` → **755**
- `bootstrap/cache` → **755**
- Archivos `.php` → **644**

---

## 5. Verificación final

| Prueba | Resultado esperado |
|---|---|
| `https://pragamedellin.com/` | Tienda cargando (layout + catálogo), con HTML prerenderizado |
| `https://pragamedellin.com/catalogo` | Catálogo (recarga OK) |
| `https://pragamedellin.com/producto/26` | Detalle de producto con HTML prerenderizado (recarga OK) |
| `https://pragamedellin.com/api/sedes` | JSON con las sedes |
| `https://pragamedellin.com/api/login` | Login del panel (POST con admin@pragamedellin.com / admin123) |
| `https://pragamedellin.com/panel` | Login del panel admin |
| `https://pragamedellin.com/sitemap.xml` | Sitemap (se regenera en cada build) |
| `https://pragamedellin.com/robots.txt` | Permite indexar + referencia al sitemap |
| `https://pragamedellin.com/og-image.png` | Imagen social del SEO |

Si la API responde 500: revisa `api-app/storage/logs/laravel.log`.

---

## 6. Publicar cambios futuros (cada actualización)

1. `cd frontend-tienda && npm run build` → subir `dist/` a la raíz de `public_html`
   (sobrescribir; incluye sitemap, robots y HTML prerenderizado).
2. `cd frontend-panel && npm run build` → subir `dist/` a `public_html/panel/`.
3. Backend: subir solo los archivos PHP modificados.
4. Cambios en BD (migraciones nuevas): generarlas y actualizar el dump, o ejecutar
   las queries nuevas en phpMyAdmin.

---

## 7. SEO — Google Search Console y Analytics

1. **Search Console**: en `frontend-tienda/.env.production` agrega tu código de
   verificación en `VITE_GSC_CODE=...` y recompila (se inyecta en el `<head>` del
   `index.html`). O verifica por DNS. Luego envía `https://pragamedellin.com/sitemap.xml`.
2. **GA4**: en `frontend-tienda/.env.production` pon tu ID de medición en
   `VITE_GA_ID=G-XXXXXXXXXX` y recompila (se inyecta el script de gtag).
3. **Google Business Profile**: crea una ficha por sede (Andalucía, Aranjuez,
   Akron Castilla, Praga Woman) con el mismo nombre/dirección/teléfono del sitio.
4. El `sitemap.xml` **y el HTML prerenderizado** se generan automáticamente en cada
   `npm run build` consultando la API (productos). Si la API no responde durante el
   build, el sitemap genera solo las URLs estáticas y se omite el prerender.
   > El prerender requiere que la API de producción responda por HTTPS durante el
   > build (por eso el SSL debe estar activo antes de compilar la tienda).

---

## Notas
- **Imágenes**: la API arma la URL de cada imagen con el host de la petición actual
  (`request()->getSchemeAndHttpHost()`), por eso funcionan en cualquier dominio sin
  tocar la base de datos. Al subir imágenes desde el panel, el backend las optimiza
  (WebP, thumb 400px, medium 1200px) y devuelve las variantes.
- El `.htaccess` raíz redirige HTTP→HTTPS, rutea `/api` y `/images` hacia Laravel,
  deja `/panel` a su propio SPA y agrega caché/compresión para rendimiento.
- El panel no se indexa (`X-Robots-Tag: noindex`).
- **Wompi**: el checkout de la tienda todavía es un placeholder; cuando se integre,
  completa `VITE_WOMPI_PUBLIC_KEY` en `frontend-tienda/.env.production` y reconstruye.
- **API protegida**: las rutas de escritura del panel requieren token (`auth:sanctum`);
  las rutas públicas (catálogo y pedidos online) siguen abiertas.