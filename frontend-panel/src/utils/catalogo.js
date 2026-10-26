// Utilidades del catálogo. Las tallas NO están hardcodeadas aquí: se derivan
// de los datos que devuelve la API (categorias/subcategorias), que en el
// backend real serán semilla de la base de datos.

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

function rangoTalla(talla) {
  const norm = String(talla ?? '').trim()
  if (!norm) return [3, 0, '']
  if (SIN_TALLA.test(norm)) return [3, 0, '']

  const idx = ORDEN_LETRAS.indexOf(norm.toUpperCase())
  if (idx !== -1) return [0, idx, '']

  const num = norm.match(/\d+/)
  if (num) return [1, parseInt(num[0], 10), norm]

  return [2, 0, norm.toUpperCase()]
}

// Ordena tallas de menor a mayor (letras canónicas primero, luego numéricas,
// y "talla única" al final). Ej: 30, 32, 34… y XS, S, M, L, XL.
export function ordenarTallas(tallas) {
  return [...(tallas || [])].sort((a, b) => {
    const ra = rangoTalla(a)
    const rb = rangoTalla(b)
    if (ra[0] !== rb[0]) return ra[0] - rb[0]
    if (ra[1] !== rb[1]) return ra[1] - rb[1]
    return String(ra[2]).localeCompare(String(rb[2]))
  })
}

// Devuelve las tallas válidas para una combinación categoría+subcategoría.
// Regla: si hay subcategoría usa sus tallas; si no, las de la categoría.
export function tallasPara(categoriaId, subcategoriaId, categorias, subcategorias) {
  if (subcategoriaId) {
    const s = subcategorias.find((x) => x.id === Number(subcategoriaId))
    if (s) return ordenarTallas(s.tallas || [])
  }
  const c = categorias.find((x) => x.id === Number(categoriaId))
  return c ? ordenarTallas(c.tallas || []) : []
}

// true si la categoría tiene subcategorías (hay que elegir una para definir tallas).
export function categoriaTieneSubcategorias(categoriaId, subcategorias) {
  return subcategorias.some((s) => s.categoria_id === Number(categoriaId))
}
