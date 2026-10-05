// Genera dist/sitemap.xml y dist/robots.txt después del build de Vite.
// - Consulta la API de producción (VITE_API_URL) para listar productos, categorías
//   y subcategorías (URLs limpias /catalogo/:catalogo/:categoria/:subcategoria).
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

async function obtenerJson(ruta) {
  if (!API) return []
  try {
    const res = await fetch(`${API}/${ruta}`)
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

function urlBase(url) {
  return {
    loc: url,
    lastmod: hoy,
    changefreq: 'daily',
    priority: '0.8',
  }
}

function generarSitemap({ productos, categorias, subcategorias }) {
  const urls = [
    { loc: `${BASE}/`, lastmod: hoy, changefreq: 'daily', priority: '1.0' },
    { loc: `${BASE}/catalogo`, lastmod: hoy, changefreq: 'daily', priority: '0.9' },
    { loc: `${BASE}/catalogo/hombre`, lastmod: hoy, changefreq: 'daily', priority: '0.9' },
    { loc: `${BASE}/catalogo/mujer`, lastmod: hoy, changefreq: 'daily', priority: '0.9' },
    { loc: `${BASE}/promociones`, lastmod: hoy, changefreq: 'daily', priority: '0.8' },
  ]

  // Categorías → /catalogo/:catalogo/:categoria
  categorias.forEach((c) => {
    urls.push(urlBase(`${BASE}/catalogo/${c.catalogo || 'hombre'}/${c.id}`))
  })

  // Subcategorías → /catalogo/:catalogo/:categoria/:subcategoria
  subcategorias.forEach((s) => {
    const cat = categorias.find((c) => c.id === s.categoria_id)
    urls.push(urlBase(`${BASE}/catalogo/${cat?.catalogo || 'hombre'}/${s.categoria_id}/${s.id}`))
  })

  // Productos (con imagen y fecha real si la API la entrega)
  productos.forEach((p) => {
    const fecha = p.updated_at ? String(p.updated_at).slice(0, 10) : hoy
    urls.push({ loc: `${BASE}/producto/${p.id}`, lastmod: fecha, changefreq: 'weekly', priority: '0.8' })
  })

  const cuerpo = urls
    .map((u) => {
      let bloque = `  <url>\n    <loc>${escapar(u.loc)}</loc>\n    <lastmod>${escapar(u.lastmod)}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n`
      if (u.imagen) bloque += `    <image:image>\n      <image:loc>${escapar(u.imagen)}</image:loc>\n    </image:image>\n`
      bloque += `  </url>`
      return bloque
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${cuerpo}\n</urlset>\n`
}

const robots = `User-agent: *
Allow: /
Disallow: /carrito
Disallow: /checkout
Sitemap: ${BASE}/sitemap.xml
`

const [productos, categorias, subcategorias] = await Promise.all([
  obtenerJson('productos'),
  obtenerJson('categorias'),
  obtenerJson('subcategorias'),
])

writeFileSync(resolve(ROOT, 'dist/sitemap.xml'), generarSitemap({ productos, categorias, subcategorias }))
writeFileSync(resolve(ROOT, 'dist/robots.txt'), robots)

console.log(
  `[sitemap] ${3 + categorias.length + subcategorias.length + productos.length} URLs (${productos.length} productos, ${categorias.length} categorías, ${subcategorias.length} subcategorías)`,
)