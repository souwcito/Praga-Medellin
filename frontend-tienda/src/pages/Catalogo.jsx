import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { catalogApi } from '../services/api'
import Seo from '../components/Seo'
import CatalogoResultados from '../components/CatalogoResultados'
import { SearchIcon } from '../components/icons'

const inputCls =
  'w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-sm placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

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

  function setQ(valor) {
    const next = new URLSearchParams(searchParams)
    if (valor) next.set('q', valor)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  const parametros = useMemo(
    () => ({
      catalogo: catalogo || undefined,
      categoria_id: categoria || undefined,
      subcategoria_id: subcategoria || undefined,
      q: q || undefined,
    }),
    [catalogo, categoria, subcategoria, q],
  )

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
            mainEntity: { '@type': 'ItemList', itemListElement: [] },
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

        <CatalogoResultados
          key={`${catalogo}|${categoria}|${subcategoria}|${q}`}
          parametros={parametros}
        />
      </div>
    </>
  )
}