// Web Worker: convierte fotos HEIC/HEIF (iPhone) a JPEG fuera del hilo principal
// para no congelar la UI. Recibe { id, file } y devuelve { id, ok, blob }.
import heic2any from 'heic2any'

self.onmessage = async (e) => {
  const { id, file } = e.data
  try {
    const resultado = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const blob = Array.isArray(resultado) ? resultado[0] : resultado
    self.postMessage({ id, ok: true, blob })
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) })
  }
}