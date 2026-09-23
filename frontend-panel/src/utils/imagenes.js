// Utilidades para subir imágenes de productos.
// Convierte fotos HEIC/HEIF (iPhone) a JPEG en el navegador antes de subirlas,
// para que se puedan mostrar en la tienda (los navegadores no renderizan HEIC).
import heic2any from 'heic2any'

export function esHeic(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  return (
    ext === 'heic' ||
    ext === 'heif' ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  )
}

// Prepara un archivo para subir: convierte HEIC/HEIF a JPEG y devuelve el
// archivo original si no es HEIC. Si la conversión falla, devuelve el original.
export async function prepararArchivoImagen(file) {
  if (!file || !esHeic(file)) return file
  try {
    const resultado = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    })
    const blob = Array.isArray(resultado) ? resultado[0] : resultado
    const nombre = file.name.replace(/\.(heic|heif)$/i, '.jpg')
    return new File([blob], nombre, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

// Convierte una ruta de imagen (relativa, ej. "images/products/x.jpg") en una
// URL absoluta para mostrarla en el <img>. Útil porque el backend guarda rutas
// relativas y el panel vive en /panel (una ruta relativa rompería la vista previa).
export function urlImagen(path) {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/.test(path)) return path
  try {
    return new URL(path, `${window.location.origin}/`).href
  } catch {
    return path
  }
}