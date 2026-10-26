// Parámetros que dependen de la PC/impresora, no del diseño compartido.
// Se guardan en el navegador del equipo que imprime.
const KEY = 'praga_label_printer_v1'

export const PRINTER_DEFAULT = {
  printerName: 'Gainscha GS-2406T',
  offsetXMm: 0,
  offsetYMm: 0,
  speed: '',
  density: '',
  calibrationNote: '',
}

export function cargarPerfilImpresora() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    return { ...PRINTER_DEFAULT, ...(raw || {}) }
  } catch {
    return { ...PRINTER_DEFAULT }
  }
}

export function guardarPerfilImpresora(perfil) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...PRINTER_DEFAULT, ...perfil }))
    return true
  } catch {
    return false
  }
}
