// Normalización de tallas para el panel. Tenis y chanclas se guardan y
// muestran solo en USA; el resto de prendas conserva su talla tal cual.

export function esTenisPorNombre(nombre) {
  return /tenis/i.test(String(nombre || ''))
}

export function esChanclasPorNombre(nombre) {
  return /chancla/i.test(String(nombre || ''))
}

// Normaliza una talla numérica de calzado:
//   "7-8/43-44" -> "7-8"   (rango USA + EUR)
//   "8.5/9-42"  -> "8.5/9" (rango USA + EUR)
//   "6-39"      -> "6"
//   "7-8"       -> "7-8"
function tallaCalzadoUSA(talla) {
  const texto = String(talla ?? '').trim()
  if (!texto) return ''

  const partes = texto.split('/')
  if (partes.length > 1) {
    const antes = partes.slice(0, -1).join('/').trim()
    const ultima = partes[partes.length - 1].trim()
    const numeros = (ultima.match(/\d+(?:[.,]\d+)?/g) || []).map((n) =>
      Number(n.replace(',', '.')),
    )

    if (numeros.length) {
      const primerEur = numeros[0]
      const ultimoEur = numeros[numeros.length - 1]
      // El bloque anterior ya es un rango USA (6-7) y el último es EUR (43-44
      // o 1-42): se descarta el último bloque.
      if (antes.includes('-') && ultimoEur >= 30) {
        return antes.replace(',', '.').trim()
      }
      // El último bloque empieza en EUR (7/43-44): se descarta.
      if (primerEur >= 30) {
        return antes.replace(',', '.').trim()
      }
    }
  }

  // Formato "USA-EUR" al final: 8-41 -> 8; 8.5/9-42 -> 8.5/9.
  const match = texto.match(/^(.+?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*$/)
  if (match) {
    const segundo = Number(match[2].replace(',', '.'))
    if (segundo >= 30) return match[1].replace(',', '.').trim()
  }

  return texto.replace(',', '.')
}

export function tallaUSA(talla) {
  return tallaCalzadoUSA(talla)
}

export function tallaChanclas(talla) {
  return tallaCalzadoUSA(talla)
}

// `contexto` puede ser "Tenis", "Chanclas" o "Tenis Originales".
export function normalizarTallaPorNombre(talla, contexto) {
  const texto = String(talla ?? '').trim()
  if (!texto) return ''
  if (esTenisPorNombre(contexto)) return tallaUSA(texto)
  if (esChanclasPorNombre(contexto)) return tallaChanclas(texto)
  return texto.replace(',', '.')
}

// Normaliza una talla solo con su formato, sin depender de la categoría.
// Sirve para etiquetas y referencias del panel.
export function normalizarTallaVisible(talla) {
  return tallaCalzadoUSA(talla)
}
