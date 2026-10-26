// Prerender estático para SEO: genera HTML por ruta en dist/ usando un navegador
// headless (Chrome/Edge del sistema vía puppeteer-core). Corre después del build.
//
// - Rutas: /, /catalogo, /catalogo/{hombre|mujer}, /catalogo/:cat/:sub, /promociones
//   y /producto/:id (los ids vienen de la API, mismo origen que el sitemap).
// - Fail-soft: si no hay navegador o la API no responde, no escribe rutas de datos
//   (queda el index.html de la SPA como fallback) y solo avisa.
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { resolve, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')

// Concurrencia y pausas configurables. El build normal usa 3 páginas a la vez
// para terminar más rápido; si la API de Hostinger se satura, se puede bajar
// con PRAGA_PRERENDER_WORKERS=2.
const WORKERS = Math.max(1, Number(process.env.PRAGA_PRERENDER_WORKERS || 3))
const PAUSA_MS = Math.max(0, Number(process.env.PRAGA_PRERENDER_PAUSE_MS || 100))

// El runtime usa /api (mismo origen), pero el prerender corre en Node/Chrome y
// necesita una URL absoluta. Si VITE_API_URL es relativa o está vacía, usamos
// la API pública de producción.
const PROD_API = 'https://pragamedellin.com/api'

function apiUrl() {
  let valor = process.env.VITE_API_URL || ''
  if (!valor) {
    try {
      const env = readFileSync(resolve(ROOT, '.env.production'), 'utf8')
      const match = env.match(/^VITE_API_URL=(.*)$/m)
      if (match) valor = match[1]
    } catch {}
  }
  const limpia = String(valor).trim().replace(/['"]/g, '')
  return /^https?:\/\//i.test(limpia) ? limpia : PROD_API
}

function buscarNavegador() {
  const candidatos = [
    process.env.PRAGA_CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean)
  for (const c of candidatos) {
    try {
      statSync(c)
      return c
    } catch {}
  }
  return null
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain',
  '.woff2': 'font/woff2',
}

function iniciarServidor() {
  return new Promise((resolveSrv) => {
    const server = createServer((req, res) => {
      let pathname
      try {
        pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
      } catch {
        pathname = '/'
      }
      if (pathname === '/') pathname = '/index.html'
      let filePath = join(DIST, pathname)
      let existe = false
      try {
        existe = statSync(filePath).isFile()
      } catch {}
      if (!existe) {
        // si termina en '/' o es un directorio, busca index.html
        try {
          if (statSync(filePath).isDirectory()) {
            filePath = join(filePath, 'index.html')
            existe = statSync(filePath).isFile()
          }
        } catch {}
      }
      if (!existe) filePath = join(DIST, 'index.html') // fallback SPA
      try {
        const cuerpo = readFileSync(filePath)
        res.writeHead(200, {
          'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-store',
        })
        res.end(cuerpo)
      } catch {
        res.writeHead(404)
        res.end('not found')
      }
    })

    // Puerto fijo permitido por CORS del backend (127.0.0.1:8000 / 5173): la API
    // de producción solo responde a esos orígenes. Si están ocupados, cae a un
    // puerto efímero (la portada se escribe igual, pero sin data de la API).
    const PUERTOS = [8000, 5173, 0]
    function intentar(idx) {
      if (idx >= PUERTOS.length) {
        resolveSrv(server)
        return
      }
      server.once('error', () => intentar(idx + 1))
      server.listen(PUERTOS[idx], '127.0.0.1', () => resolveSrv(server))
    }
    intentar(0)
  })
}

async function obtenerJson(ruta) {
  const API = apiUrl()
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

function construirRutas({ productos, categorias, subcategorias }) {
  const rutas = ['/', '/catalogo', '/catalogo/hombre', '/catalogo/mujer', '/promociones', '/fragancia-exclusiva', '/guia-tallas']
  categorias.forEach((c) => {
    rutas.push(`/catalogo/${c.catalogo || 'hombre'}/${c.id}`)
  })
  subcategorias.forEach((s) => {
    const cat = categorias.find((c) => c.id === s.categoria_id)
    rutas.push(`/catalogo/${cat?.catalogo || 'hombre'}/${s.categoria_id}/${s.id}`)
  })
  productos.forEach((p) => rutas.push(`/producto/${p.id}`))
  return rutas
}

// Rutas que no dependen de la API. El build rápido (--static) prerenderiza solo
// estas para que /guia-tallas y las páginas base tengan HTML para SEO/chatbot.
const RUTAS_ESTATICAS = new Set([
  '/',
  '/catalogo',
  '/catalogo/hombre',
  '/catalogo/mujer',
  '/promociones',
  '/fragancia-exclusiva',
  '/guia-tallas',
])

function rutaArchivo(ruta) {
  return ruta === '/' ? join(DIST, 'index.html') : join(DIST, ruta, 'index.html')
}

// Preload del LCP: inyecta el <link rel="preload"> del primer banner en el
// <head> del HTML de la portada. Sin esto, el preload lo agrega React en
// runtime (demasiado tarde para la carga inicial). El banner ahora usa la
// imagen pública en /banners (versión horizontal del primer slide).
function inyectarPreloadBanner(html) {
  if (html.includes('rel="preload" as="image"')) return html
  const preload = `<link rel="preload" as="image" fetchpriority="high" href="/banners/imagen1-banner-praga-2560x1440.png">`
  if (html.includes(preload)) return html
  return html.replace('</head>', `  ${preload}\n  </head>`)
}

async function capturarPagina(browser, ruta, port, { home = false } = {}) {
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1366, height: 900 })
    // Marca la página como "prerender": la app evita peticiones que no aportan
    // al HTML estático (p. ej. productos relacionados) y el build termina mucho
    // más rápido sin saturar la API.
    await page.evaluateOnNewDocument(() => {
      window.__PRAGA_PRERENDER__ = true
    })
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const u = req.url()
      if (/googletagmanager\.com|google-analytics\.com/.test(u)) {
        req.abort()
      } else {
        req.continue()
      }
    })
    // La API en Hostinger puede tardar unos segundos: tolerancia amplia y
    // reintento con waitUntil 'load' si networkidle2 no se estabiliza.
    let resp
    try {
      resp = await page.goto(`http://127.0.0.1:${port}${ruta}`, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      })
    } catch {
      resp = await page.goto(`http://127.0.0.1:${port}${ruta}`, {
        waitUntil: 'load',
        timeout: 60000,
      })
    }
    if (!resp) return { ruta, html: null, error: true }

    const esProducto = /^\/producto\//.test(ruta)
    const esListado =
      /^\/catalogo\/[^/]+/.test(ruta) || ruta === '/promociones'

    // Espera explícita a que React pinte la data. Sin esto, una respuesta lenta
    // de la API se confundía con un error y la página se omitía.
    if (esProducto) {
      await page
        .waitForSelector('h1', { timeout: 20000 })
        .catch(() => {})
    } else if (esListado) {
      await page
        .waitForFunction(
          () =>
            /\d+ productos? disponibles|Sin resultados|No hay productos|No pudimos cargar|La tienda está presentando problemas|No pudimos conectar/.test(
              document.body.innerText,
            ),
          { timeout: 20000 },
        )
        .catch(() => {})
    }

    // Pequeña espera extra para que React termine de pintar tras la data
    await new Promise((r) => setTimeout(r, 400))
    // El DOM serializa las URLs de los assets como absolutas del servidor local
    // (http://127.0.0.1:PUERTO/assets/...). Se normalizan a rutas raíz relativas
    // para que apunten al dominio en producción (cualquier puerto, por si el HTML
    // servido ya trae referencias de una corrida anterior).
    const html = (await page.content()).replace(/http:\/\/127\.0\.0\.1:\d+/g, '')
    // Detección de error por ruta. NO se usa `.text-red-700` (el header tiene un
    // enlace "Promociones" rojo permanente). La portada ('/') SIEMPRE se escribe:
    // su contenido principal (banner, header, footer) es estático y un fallo de
    // "Destacados" es transitorio, no debe dejar el HTML vacío.
    let error = false
    if (!home) {
      error = await page.evaluate((esProducto) => {
        const texto = document.body.innerText
        if (texto.includes('Network Error')) return true
        if (texto.includes('Error cargando')) return true
        if (texto.includes('No pudimos cargar')) return true
        if (texto.includes('La tienda está presentando problemas')) return true
        if (texto.includes('Producto no encontrado')) return true
        if (esProducto && !document.querySelector('h1')) return true
        return false
      }, esProducto)
    }
    return { ruta, html, error }
  } catch {
    return { ruta, html: null, error: true }
  } finally {
    try {
      await page.close()
    } catch {}
  }
}

async function main() {
  const navegador = buscarNavegador()
  if (!navegador) {
    console.log('[prerender] no se encontró Chrome/Edge; se omite (queda SPA).')
    return
  }

  const [productos, categorias, subcategorias] = await Promise.all([
    obtenerJson('productos'),
    obtenerJson('categorias'),
    obtenerJson('subcategorias'),
  ])

  const rutas = construirRutas({ productos, categorias, subcategorias })
  const soloEstaticas = process.argv.includes('--static')
  const rutasFinales = soloEstaticas
    ? rutas.filter((ruta) => RUTAS_ESTATICAS.has(ruta))
    : rutas
  const servidor = await iniciarServidor()
  const port = servidor.address().port

  let browser
  try {
    browser = await puppeteer.launch({
      executablePath: navegador,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions'],
    })
  } catch (e) {
    console.log(`[prerender] error al lanzar el navegador: ${e.message}`)
    servidor.close()
    return
  }

  let escritas = 0
  let omitidas = 0

  // Pool de concurrencia (2 páginas a la vez, más estable en memoria)
  const COLA = [...rutasFinales]
  async function trabajador() {
    while (COLA.length) {
      const ruta = COLA.shift()
      let res
      try {
        res = await capturarPagina(browser, ruta, port, { home: ruta === '/' })
        // Un fallo aislado de la API (hosting lento, red) no debe dejar la
        // página con "Network Error": se reintenta una vez antes de omitirla.
        if (res.error) {
          await new Promise((r) => setTimeout(r, 600))
          res = await capturarPagina(browser, ruta, port, { home: ruta === '/' })
        }
      } catch {
        res = { ruta, html: null, error: true }
      }
      // La portada se escribe siempre que haya HTML (aunque "Destacados" falle)
      if (res.html && (!res.error || ruta === '/')) {
        const destino = rutaArchivo(res.ruta)
        let html = res.html
        if (ruta === '/') html = inyectarPreloadBanner(html)
        mkdirSync(dirname(destino), { recursive: true })
        writeFileSync(destino, html)
        escritas++
        console.log(`[prerender] ✓ ${res.ruta}`)
      } else {
        omitidas++
        console.log(`[prerender] - ${res.ruta} (sin datos o error; queda fallback SPA)`)
      }

      // Pausa breve entre páginas para no saturar la API de Hostinger.
      if (PAUSA_MS > 0) await new Promise((r) => setTimeout(r, PAUSA_MS))
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, () => trabajador()))

  await browser.close()
  servidor.close()
  console.log(`[prerender] listo: ${escritas} páginas prerenderizadas, ${omitidas} omitidas (${rutasFinales.length} rutas).`)
}

main()