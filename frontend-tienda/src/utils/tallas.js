// Orden canónico de tallas para la tienda. Garantiza que las tallas se muestren
// siempre en el mismo orden lógico según la prenda:
//   - Letras: XS, XS/S, S, S/M, M, M/L, L, XL, 2XL, 3XL, XXL (y "Talla única" al final)
//   - Numéricas (jeans/mochos/calzado): por el primer número ascendente
//     (28 < 30 < 32…, 7-40 < 8-41 < 10-43, 01-6 < 03-8 < 11-16)
//   - Desconocidas: alfabético

const ORDEN_LETRAS = [
  'XS',
  'XS/S',
  'XS-S',
  'S',
  'S/M',
  'M',
  'M/L',
  'L',
  'XL',
  '2XL',
  '3XL',
  'XXL',
]

const SIN_TALLA = /^talla\s*[uú]nica$/i

// Devuelve una clave comparable [grupo, valor, desempate].
function rangoTalla(talla) {
  const norm = String(talla ?? '').trim()
  if (!norm) return [3, 0, ''] // sin talla => "única", al final
  if (SIN_TALLA.test(norm)) return [3, 0, '']

  const idx = ORDEN_LETRAS.indexOf(norm.toUpperCase())
  if (idx !== -1) return [0, idx, '']

  const num = norm.match(/\d+/)
  if (num) return [1, parseInt(num[0], 10), norm]

  return [2, 0, norm.toUpperCase()]
}

function compararTallas(a, b) {
  const ra = rangoTalla(a)
  const rb = rangoTalla(b)
  if (ra[0] !== rb[0]) return ra[0] - rb[0]
  if (ra[1] !== rb[1]) return ra[1] - rb[1]
  return String(ra[2]).localeCompare(String(rb[2]))
}

// Ordena un arreglo de tallas (strings).
export function ordenarTallas(tallas) {
  return [...(tallas || [])].sort(compararTallas)
}

// Ordena un arreglo de variantes (objetos con `talla`) según el orden canónico.
export function ordenarPorTalla(variantes) {
  if (!Array.isArray(variantes)) return []
  return [...variantes].sort((a, b) => compararTallas(a?.talla, b?.talla))
}

// Los tenis usan USA como sistema visible. Los datos nuevos ya guardan solo
// USA; esta funcion tambien entiende el formato anterior "8-41" o "8.5/9-42".
export function esTenis(producto) {
  const nombre = `${producto?.categoria || ''} ${producto?.subcategoria || ''}`.toLowerCase()
  return nombre.includes('tenis') || [12, 28].includes(Number(producto?.categoria_id))
}

// Chanclas: la talla visible también es USA. Puede venir como "7-8/43-44"
// (rango USA / rango EUR) o en el formato viejo "7-40" (USA-EUR).
export function esChanclas(producto) {
  const nombre = `${producto?.categoria || ''} ${producto?.subcategoria || ''}`.toLowerCase()
  return nombre.includes('chancla') || [4, 18].includes(Number(producto?.categoria_id))
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

// Chanclas: conserva el rango USA y quita el bloque EUR.
// "7-8/43-44" -> "7-8"; "6-39" -> "6"; "7-8" -> "7-8".
export function tallaChanclas(talla) {
  return tallaCalzadoUSA(talla)
}

// Normaliza la talla según el tipo de producto (tenis, chanclas u otro).
export function normalizarTalla(talla, producto) {
  const texto = String(talla ?? '').trim()
  if (!texto) return ''
  if (esTenis(producto)) return tallaUSA(texto)
  if (esChanclas(producto)) return tallaChanclas(texto)
  return texto.replace(',', '.')
}

// Convierte una talla normalizada en intervalos numéricos. Sirve para que
// "7" coincida con "6-7" o "7-8", y "8" con "8-9" o "6-7/8-9".
function intervalosTalla(talla) {
  const texto = String(talla ?? '').trim()
  if (!texto) return []

  return texto
    .split('/')
    .map((bloque) => {
      const numeros = bloque.match(/\d+(?:[.,]\d+)?/g) || []
      if (!numeros.length) return null
      const a = Number(numeros[0].replace(',', '.'))
      const b = numeros[1] ? Number(numeros[1].replace(',', '.')) : a
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null
      return [Math.min(a, b), Math.max(a, b)]
    })
    .filter(Boolean)
}

export function tallasCompatibles(a, b) {
  const ia = intervalosTalla(a)
  const ib = intervalosTalla(b)
  return ia.some(([a1, a2]) => ib.some(([b1, b2]) => a1 <= b2 && b1 <= a2))
}

// Compara la talla de una variante con la talla elegida en el filtro. Para
// tenis/chanclas acepta rangos: "7" coincide con "6-7" y "7-8".
export function coincideTalla(tallaVariante, tallaFiltro, producto) {
  const variante = normalizarTalla(tallaVariante, producto)
  const filtro = normalizarTalla(tallaFiltro, producto)
  if (!variante || !filtro) return false
  if (variante === filtro) return true
  if (esTenis(producto) || esChanclas(producto)) {
    return tallasCompatibles(variante, filtro)
  }
  return false
}

// Etiqueta visible: USA para tenis y chanclas; para el resto, talla real.
export function etiquetaTalla(talla, producto) {
  const texto = String(talla ?? '').trim()
  if (!texto) return ''
  return normalizarTalla(texto, producto)
}
