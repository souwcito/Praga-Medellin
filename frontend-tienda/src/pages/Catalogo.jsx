import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { catalogApi } from '../services/api'
import Seo from '../components/Seo'
import ProductCard from '../components/ProductCard'
import { SearchIcon } from '../components/icons'

const inputCls =
  'w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-sm placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const LIMITE = 40

export default function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams()
  const catalogo = searchParams.get('catalogo') || ''
  const categoria = searchParams.get('categoria') || ''
  const subcategoria = searchParams.get('subcategoria') || ''
  const q = searchParams.get('q') || ''

  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
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

  const categoriaActual = categorias.find((c) => c.id === Number(categoria))
  const subcategoriaActual = subcategorias.find((s) => s.id === Number(subcategoria))
  const titulo =
    categoriaActual?.nombre ||
    (catalogo === 'mujer' ? 'Catálogo Mujer' : catalogo === 'hombre' ? 'Catálogo Hombre' : 'Catálogo')

  // La búsqueda vive en la URL (q): escribir actualiza el enlace sin estado extra
  function setQ(valor) {
    const next = new URLSearchParams(searchParams)
    if (valor) next.set('q', valor)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  const filtros = { catalogo, categoria, subcategoria, q }

  return (
    <>
      <Seo
        title={titulo}
        description="Explora el catálogo de Praga Medellín: camisetas, buzos, tenis, gorras y más."
        url={`https://pragamedellin.com${window.location.pathname}${window.location.search}`}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${titulo} | Praga Medellín`,
            description: 'Catálogo de ropa y accesorios urbanos en Medellín.',
            url: `https://pragamedellin.com${window.location.pathname}${window.location.search}`,
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: [],
            },
          },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
            {titulo}
          </h1>
          {subcategoriaActual && (
            <p className="mt-2 text-sm text-ink-2">· {subcategoriaActual.nombre}</p>
          )}
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

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Se remonta al cambiar filtros/búsqueda: carga paginada desde cero */}
        <Resultados
          key={`${catalogo}|${categoria}|${subcategoria}|${q}`}
          filtros={filtros}
        />
      </div>
    </>
  )
}

// Carga paginada del catálogo: primero 40 y "Cargar más" si hay más.
function Resultados({ filtros }) {
  const { catalogo, categoria, subcategoria, q } = filtros
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    catalogApi
      .getProductos({
        catalogo: catalogo || undefined,
        categoria_id: categoria || undefined,
        subcategoria_id: subcategoria || undefined,
        q: q || undefined,
        limit: LIMITE,
        offset: 0,
      })
      .then((p) => {
        setProductos(p)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando productos'))
      .finally(() => setLoading(false))
  }, [catalogo, categoria, subcategoria, q])

  function cargarMas() {
    setCargandoMas(true)
    catalogApi
      .getProductos({
        catalogo: catalogo || undefined,
        categoria_id: categoria || undefined,
        subcategoria_id: subcategoria || undefined,
        q: q || undefined,
        limit: LIMITE,
        offset: productos.length,
      })
      .then((p) => setProductos((prev) => [...prev, ...p]))
      .catch((err) => setError(err?.message || 'Error cargando más productos'))
      .finally(() => setCargandoMas(false))
  }

  const hayMas = productos.length >= LIMITE

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-80 animate-pulse rounded-2xl border border-line bg-surface-2" />
        ))}
      </div>
    )
  }

  if (productos.length === 0) {
    return (
      <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
        {q ? 'Sin resultados para esa búsqueda.' : 'No hay productos en esta selección.'}
      </div>
    )
  }

  return (
    <>
      <p className="mb-4 text-sm text-ink-2">
        {productos.length} producto{productos.length === 1 ? '' : 's'} mostrados
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {productos.map((p) => (
          <ProductCard key={p.id} producto={p} />
        ))}
      </div>

      {hayMas && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={cargarMas}
            disabled={cargandoMas}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-8 py-3 text-sm font-semibold text-ink transition-all duration-200 hover:border-ink-2/40 hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50"
          >
            {cargandoMas ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
                Cargando…
              </>
            ) : (
              'Cargar más productos'
            )}
          </button>
        </div>
      )}
    </>
  )
}