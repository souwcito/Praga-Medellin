// Genera dist/sitemap.xml y dist/robots.txt después del build de Vite.
// - Consulta la API de producción (VITE_API_URL) para listar los productos.
// - Fail-soft: si la API no responde, genera el sitemap solo con las URLs estáticas.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// Lee VITE_API_URL de process.env o del archivo .env.production
function apiUrl() {
  if (process.env.VITE_API_URL) return process.env.VITE_API_URL
  try {
    const env = readFileSync(resolve(ROOT, '.env.production'), 'utf8')
    const match = env.match(/^VITE_API_URL=(.*)$/m)
    if (match) return match[1].trim().replace(/['"]/g, '')
  } catch {
    /* no hay .env.production */
  }
  return ''
}

const BASE = 'https://pragamedellin.com'
const API = apiUrl()

async function obtenerProductos() {
  if (!API) return []
  try {
    const res = await fetch(`${API}/productos`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

const hoy = new Date().toISOString().slice(0, 10)

function escapar(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function generarSitemap(productos) {
  const urls = [
    { loc: `${BASE}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${BASE}/catalogo`, changefreq: 'daily', priority: '0.9' },
    { loc: `${BASE}/promociones`, changefreq: 'daily', priority: '0.8' },
  ]
  productos.forEach((p) => {
    urls.push({ loc: `${BASE}/producto/${p.id}`, changefreq: 'weekly', priority: '0.8', lastmod: hoy })
  })

  const cuerpo = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapar(u.loc)}</loc>\n    <lastmod>${u.lastmod || hoy}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${cuerpo}\n</urlset>\n`
}

const robots = `User-agent: *
Allow: /
Sitemap: ${BASE}/sitemap.xml
`

const productos = await obtenerProductos()
writeFileSync(resolve(ROOT, 'dist/sitemap.xml'), generarSitemap(productos))
writeFileSync(resolve(ROOT, 'dist/robots.txt'), robots)

console.log(
  `[sitemap] generado con ${productos.length + 2} URLs (${productos.length} productos)`,
)