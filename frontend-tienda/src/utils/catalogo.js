// Tallas derivadas de los datos de la API (categorias/subcategorias), nunca hardcodeadas.
export function tallasPara(categoriaId, subcategoriaId, categorias, subcategorias) {
  if (subcategoriaId) {
    const s = subcategorias.find((x) => x.id === Number(subcategoriaId))
    if (s) return s.tallas || []
  }
  const c = categorias.find((x) => x.id === Number(categoriaId))
  return c ? c.tallas || [] : []
}

export function categoriaTieneSubcategorias(categoriaId, subcategorias) {
  return subcategorias.some((s) => s.categoria_id === Number(categoriaId))
}