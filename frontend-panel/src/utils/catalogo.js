// Utilidades del catálogo. Las tallas NO están hardcodeadas aquí: se derivan
// de los datos que devuelve la API (categorias/subcategorias), que en el
// backend real serán semilla de la base de datos.

// Devuelve las tallas válidas para una combinación categoría+subcategoría.
// Regla: si hay subcategoría usa sus tallas; si no, las de la categoría.
export function tallasPara(categoriaId, subcategoriaId, categorias, subcategorias) {
  if (subcategoriaId) {
    const s = subcategorias.find((x) => x.id === Number(subcategoriaId))
    if (s) return s.tallas || []
  }
  const c = categorias.find((x) => x.id === Number(categoriaId))
  return c ? c.tallas || [] : []
}

// true si la categoría tiene subcategorías (hay que elegir una para definir tallas).
export function categoriaTieneSubcategorias(categoriaId, subcategorias) {
  return subcategorias.some((s) => s.categoria_id === Number(categoriaId))
}