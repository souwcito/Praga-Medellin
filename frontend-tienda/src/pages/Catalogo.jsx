import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { catalogApi } from '../services/api'
import Seo from '../components/Seo'
import ProductCard from '../components/ProductCard'
import { SearchIcon } from '../components/icons'

const inputCls =
  'w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-sm placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

export default function Catalogo() {
  const [searchParams] = useSearchParams()
  const categoria = searchParams.get('categoria') || ''
  const subcategoria = searchParams.get('subcategoria') || ''

  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([catalogApi.getCategorias(), catalogApi.getSubcategorias()])
      .then(([c, s]) => {
        setCategorias(c)
        setSubcategorias(s)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando el catálogo'))
  }, [])

  useEffect(() => {
    catalogApi
      .getProductos({
        categoria_id: categoria || undefined,
        subcategoria_id: subcategoria || undefined,
      })
      .then((p) => {
        setProductos(p)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando productos'))
      .finally(() => setLoading(false))
  }, [categoria, subcategoria])

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return productos
    return productos.filter((p) => p.nombre.toLowerCase().includes(term))
  }, [productos, q])

  const categoriaActual = categorias.find((c) => c.id === Number(categoria))
  const subcategoriaActual = subcategorias.find((s) => s.id === Number(subcategoria))

  return (
    <>
      <Seo
        title={categoriaActual ? categoriaActual.nombre : 'Catálogo'}
        description="Explora el catálogo de Praga Medellín: camisetas, buzos, tenis, gorras y más."
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
            {categoriaActual ? categoriaActual.nombre : 'Catálogo'}
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
            {subcategoriaActual ? ` · ${subcategoriaActual.nombre}` : ''}
          </p>
        </div>

        {/* Búsqueda */}
        <div className="relative mb-8 max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2/50" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en el catálogo…"
            className={inputCls}
          />
        </div>

        {/* Grid de productos */}
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl border border-line bg-surface-2" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
            {q ? 'Sin resultados para esa búsqueda.' : 'No hay productos en esta selección.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtrados.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}