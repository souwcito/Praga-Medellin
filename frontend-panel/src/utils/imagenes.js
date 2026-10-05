// Utilidades para subir imágenes de productos.
// - HEIC/HEIF (iPhone) se convierte a JPEG en un Web Worker (sin congelar la UI).
// - Toda imagen se comprime y re-encoda en el navegador (≤1600px, WebP/JPEG) para
//   que el upload sea rápido aunque la foto original pese varios MB.
// - Convierte rutas relativas del backend en URLs absolutas para el <img>.

let workerPromise = null
let workerId = 0

function obtenerWorker() {
  if (!workerPromise) {
    workerPromise = new Promise((resolve, reject) => {
      const w = new Worker(new URL('../workers/heic.worker.js', import.meta.url), { type: 'module' })
      w.onmessage = () => resolve(w)
      w.onerror = () => reject(new Error('No se pudo iniciar la conversión HEIC'))
    })
  }
  return workerPromise
}

function convertirHeic(file) {
  return obtenerWorker().then((w) =>
    new Promise((resolve, reject) => {
      const id = ++workerId
      const handler = (e) => {
        if (e.data && e.data.id === id) {
          w.removeEventListener('message', handler)
          if (e.data.ok) resolve(e.data.blob)
          else reject(new Error(e.data.error))
        }
      }
      w.addEventListener('message', handler)
      w.postMessage({ id, file })
    }),
  )
}

export function esHeic(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  return (
    ext === 'heic' ||
    ext === 'heif' ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  )
}

const MAX_LADO = 1600
const CALIDAD = 0.82
const MIN_TAMANO = 350 * 1024

function leerComoImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

// Comprime y re-encoda una imagen (WebP si el navegador lo soporta, si no JPEG).
// Devuelve el archivo original si ya es pequeño o si algo falla.
export async function comprimirImagen(file) {
  if (!file) return file
  try {
    const img = await leerComoImagen(file)
    const escala = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight))
    if (escala === 1 && file.size <= MIN_TAMANO) return file

    const w = Math.max(1, Math.round(img.naturalWidth * escala))
    const h = Math.max(1, Math.round(img.naturalHeight * escala))
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const ctx = cv.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)

    const usaWebp = cv.toDataURL('image/webp').startsWith('data:image/webp')
    const mime = usaWebp ? 'image/webp' : 'image/jpeg'
    const blob = await new Promise((res) => cv.toBlob(res, mime, CALIDAD))
    if (!blob) return file
    const nombre = file.name.replace(/\.[^.]+$/, usaWebp ? '.webp' : '.jpg')
    return new File([blob], nombre, { type: mime })
  } catch {
    return file
  }
}

// Prepara un archivo para subir: convierte HEIC→JPEG (worker) y comprime.
export async function prepararArchivoImagen(file) {
  if (!file) return file
  if (esHeic(file)) {
    try {
      const blob = await convertirHeic(file)
      const nombre = file.name.replace(/\.(heic|heif)$/i, '.jpg')
      return await comprimirImagen(new File([blob], nombre, { type: 'image/jpeg' }))
    } catch {
      return file
    }
  }
  return comprimirImagen(file)
}

// Sube varios archivos en paralelo con un límite de concurrencia.
// fnSubir: (archivo) => Promise<url>. Devuelve { urls, errores }.
export async function subirConLimite(archivos, fnSubir, limite = 3) {
  const cola = [...archivos]
  const urls = []
  const errores = []

  async function trabajador() {
    while (cola.length) {
      const f = cola.shift()
      try {
        urls.push(await fnSubir(f))
      } catch (err) {
        errores.push((err && err.message) || 'Error subiendo imagen')
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limite, archivos.length) }, trabajador))
  return { urls, errores }
}

// Convierte una ruta de imagen (relativa, ej. "images/products/x.webp") en una
// URL absoluta para mostrarla en el <img>. El panel vive en /panel, así que una
// ruta relativa rompería la vista previa.
export function urlImagen(path) {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/.test(path)) return path
  try {
    return new URL(path, `${window.location.origin}/`).href
  } catch {
    return path
  }
}