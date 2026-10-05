import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { catalogApi } from '../services/api'
import Seo from '../components/Seo'
import CatalogoResultados from '../components/CatalogoResultados'
import { SearchIcon } from '../components/icons'

const inputCls =
  'w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-sm placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

export default function Catalogo() {
  // URLs limpias: /catalogo/:catalogo/:categoria/:subcategoria (ids numéricos)
  const params = useParams()
  const catalogo = params.catalogo || ''
  const categoria = params.categoria || ''
  const subcategoria = params.subcategoria || ''

  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''

  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [productos, setProductos] = useState([])
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
    subcategoriaActual?.nombre ||
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

  const urlActual = `https://pragamedellin.com${window.location.pathname}${window.location.search}`

  const breadcrumb = useMemo(() => {
    const items = [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://pragamedellin.com/' },
      { '@type': 'ListItem', position: 2, name: 'Catálogo', item: 'https://pragamedellin.com/catalogo' },
    ]
    let pos = 3
    if (catalogo) {
      items.push({
        '@type': 'ListItem',
        position: pos++,
        name: catalogo === 'mujer' ? 'Mujer' : 'Hombre',
        item: `https://pragamedellin.com/catalogo/${catalogo}`,
      })
    }
    if (categoriaActual) {
      items.push({
        '@type': 'ListItem',
        position: pos++,
        name: categoriaActual.nombre,
        item: `https://pragamedellin.com/catalogo/${catalogo}/${categoriaActual.id}`,
      })
    }
    if (subcategoriaActual) {
      items.push({
        '@type': 'ListItem',
        position: pos++,
        name: subcategoriaActual.nombre,
      })
    }
    return items
  }, [catalogo, categoriaActual, subcategoriaActual])

  const jsonLd = useMemo(() => {
    const ld = [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${titulo} | Praga Medellín`,
        description: 'Catálogo de ropa y accesorios urbanos en Medellín.',
        url: urlActual,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: (q ? [] : productos.slice(0, 40)).map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://pragamedellin.com/producto/${p.id}`,
            name: p.nombre,
            image: p.imagen_url,
          })),
        },
      },
    ]
    if (categoriaActual || subcategoriaActual) {
      ld.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumb,
      })
    }
    return ld
  }, [titulo, urlActual, productos, q, categoriaActual, subcategoriaActual, breadcrumb])

  return (
    <>
      <Seo
        title={titulo}
        description={`${titulo} en Praga Medellín: camisetas, buzos, tenis, gorras y más. 4 sedes en Medellín y envíos a todo Colombia.`}
        url={urlActual}
        jsonLd={jsonLd}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
            {titulo}
          </h1>
          {subcategoriaActual && (
            <p className="mt-2 text-sm text-ink-2">· {categoriaActual?.nombre}</p>
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
          onProductos={setProductos}
        />
      </div>
    </>
  )
}