// Genera y optimiza imágenes del proyecto usando Chrome headless + canvas (GD no
// disponible en este entorno; Chrome re-encodea a WebP y compone la OG image).
//
// Qué hace:
//   - Convierte los banners de la tienda (JPG → WebP)
//   - Convierte los logos de la marca (PNG → WebP) en tienda y panel
//   - Crea public/og-image.png (1200×630) para redes sociales
//   - Crea public/favicon.png (64×64) y public/apple-touch-icon.png (180×180)
//   - Crea public/site.webmanifest
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PANEL = resolve(ROOT, '..', 'frontend-panel')

const ASSETS = resolve(ROOT, 'src', 'assets')
const PUBLIC = resolve(ROOT, 'public')
const PANEL_ASSETS = resolve(PANEL, 'src', 'assets')

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

function dataUrl(ruta, mime) {
  return `data:${mime};base64,${readFileSync(ruta).toString('base64')}`
}

function guardarDataUrl(expr, destino) {
  const b64 = String(expr).split(',')[1]
  mkdirSync(dirname(destino), { recursive: true })
  writeFileSync(destino, Buffer.from(b64, 'base64'))
}

// IMPORTANTE: estas funciones se envían al navegador; no pueden capturar
// variables del módulo (puppeteer las serializa). Reciben todo por argumento.
async function convertirEnPagina({ dataUrl, mime, quality, maxW, maxH }) {
  const img = new Image()
  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = () => rej(new Error('img'))
    img.src = dataUrl
  })
  const escala = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight)
  const w = Math.max(1, Math.round(img.naturalWidth * escala))
  const h = Math.max(1, Math.round(img.naturalHeight * escala))
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  return cv.toDataURL(mime, quality)
}

async function compoOG({ logo }) {
  const W = 1200
  const H = 630
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0a0a0a')
  g.addColorStop(1, '#1f1f24')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(W / 2, H / 2 - 40, 250, 0, Math.PI * 2)
  ctx.stroke()

  const img = new Image()
  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = () => rej(new Error('logo'))
    img.src = logo
  })
  const lado = 330
  ctx.save()
  ctx.beginPath()
  ctx.arc(W / 2, H / 2 - 40, lado / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, W / 2 - lado / 2, H / 2 - 40 - lado / 2, lado, lado)
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = "800 64px Poppins, 'Arial Black', Arial, sans-serif"
  ctx.fillText('PRAGA MEDELLÍN', W / 2, H / 2 + 170)
  ctx.fillStyle = '#8c8c8c'
  ctx.font = '600 22px Poppins, Arial, sans-serif'
  ctx.fillText('ROPA Y ACCESORIOS URBANOS', W / 2, H / 2 + 215)
  ctx.fillStyle = '#4a4a4a'
  ctx.font = '500 20px Poppins, Arial, sans-serif'
  ctx.fillText('pragamedellin.com', W / 2, H / 2 + 255)
  return cv.toDataURL('image/png')
}

const WEBMANIFEST = `{
  "name": "Praga Medellín",
  "short_name": "Praga",
  "description": "Ropa y accesorios urbanos. Camisetas, buzos, tenis, gorras, jeans y más. 4 sedes en Medellín.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/favicon.png", "sizes": "64x64", "type": "image/png" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ]
}
`

async function main() {
  const navegador = buscarNavegador()
  if (!navegador) {
    console.log('[generate-images] no se encontró Chrome/Edge; se omite.')
    return
  }
  const browser = await puppeteer.launch({
    executablePath: navegador,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const convertir = (src, mime, dest, quality, maxW = 2000, maxH = 2000) =>
    page
      .evaluate(convertirEnPagina, { dataUrl: dataUrl(src, mime), mime: 'image/webp', quality, maxW, maxH })
      .then((out) => {
        guardarDataUrl(out, dest)
        console.log(`[generate-images] webp ${basename(dest)} (desde ${basename(src)})`)
      })

  // 1) Banners de la tienda → WebP
  await convertir(resolve(ASSETS, 'imagen-banner-1.jpeg'), 'image/jpeg', resolve(ASSETS, 'imagen-banner-1.webp'), 0.82, 1600, 1200)
  await convertir(resolve(ASSETS, 'imagen-banner-2.jpeg'), 'image/jpeg', resolve(ASSETS, 'imagen-banner-2.webp'), 0.82, 1600, 1200)

  // 2) Logos tienda + panel → WebP (con transparencia)
  for (const dir of [ASSETS, PANEL_ASSETS]) {
    await convertir(resolve(dir, 'logo-praga.png'), 'image/png', resolve(dir, 'logo-praga.webp'), 0.9, 512, 512)
    await convertir(resolve(dir, 'logo-praga-woman.png'), 'image/png', resolve(dir, 'logo-praga-woman.webp'), 0.9, 512, 512)
    await convertir(resolve(dir, 'logo-akron.png'), 'image/png', resolve(dir, 'logo-akron.webp'), 0.9, 512, 512)
  }

  // 3) OG image 1200×630
  const og = await page.evaluate(compoOG, { logo: dataUrl(resolve(ASSETS, 'logo-praga.png'), 'image/png') })
  guardarDataUrl(og, resolve(PUBLIC, 'og-image.png'))
  console.log('[generate-images] og-image.png (1200×630)')

  // 4) Favicon 64×64 y apple-touch-icon 180×180
  await convertir(resolve(ASSETS, 'logo-praga.png'), 'image/png', resolve(PUBLIC, 'favicon.png'), 0.92, 64, 64)
  await convertir(resolve(ASSETS, 'logo-praga.png'), 'image/png', resolve(PUBLIC, 'apple-touch-icon.png'), 0.92, 180, 180)

  // 5) Web manifest
  writeFileSync(resolve(PUBLIC, 'site.webmanifest'), WEBMANIFEST)
  console.log('[generate-images] site.webmanifest')

  await browser.close()
  console.log('[generate-images] listo.')
}

main()