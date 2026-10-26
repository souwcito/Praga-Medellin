import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigationType, useParams, useSearchParams } from 'react-router-dom'
import { catalogApi } from '../services/api'
import Seo from '../components/Seo'
import CatalogoResultados from '../components/CatalogoResultados'
import CatalogoCategorias from '../components/CatalogoCategorias'
import GuiaTallasModal from '../components/GuiaTallasModal'
import { ChevronRightIcon, SearchIcon } from '../components/icons'
import { normalizarTalla, ordenarTallas, tallaChanclas, tallaUSA, tallasCompatibles } from '../utils/tallas'

const inputCls =
  'w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-sm placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

export default function Catalogo() {
  // URLs limpias: /catalogo/:catalogo/:categoria/:subcategoria (ids numéricos)
  const params = useParams()
  const catalogo = params.catalogo || ''
  const categoria = params.categoria || ''
  const subcategoria = params.subcategoria || ''

  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navType = useNavigationType()
  const q = searchParams.get('q') || ''
  const ver = searchParams.get('ver') || ''
  const talla = searchParams.get('talla') || ''

  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [error, setError] = useState(null)
  const [intento, setIntento] = useState(0)
  const [guiaTallas, setGuiaTallas] = useState(false)

  // Tallas reales que se han visto en los productos de esta categoría. Se
  // acumulan para que el filtro no se encoja al aplicar una talla y para no
  // mostrar tallas viejas de la configuración (7, 8, 9) cuando los productos
  // usan rangos (7-8, 8-9, 10-11).
  const contextoFiltro = `${catalogo}|${categoria}|${subcategoria}`
  const contextoProductosRef = useRef(contextoFiltro)
  const [tallasProducto, setTallasProducto] = useState({ contexto: '', tallas: [] })

  useEffect(() => {
    if (contextoProductosRef.current !== contextoFiltro) {
      contextoProductosRef.current = contextoFiltro
      setTallasProducto({ contexto: contextoFiltro, tallas: [] })
      return
    }
    if (!productos.length) return

    setTallasProducto((prev) => {
      const base = prev.contexto === contextoFiltro ? prev.tallas : []
      const set = new Set(base)
      let cambio = prev.contexto !== contextoFiltro
      productos.forEach((producto) => {
        ;(producto.variantes || []).forEach((variante) => {
          if (Number(variante.stock || 0) <= 0) return
          const talla = normalizarTalla(variante.talla, producto)
          if (talla && !set.has(talla)) {
            set.add(talla)
            cambio = true
          }
        })
      })
      return cambio ? { contexto: contextoFiltro, tallas: [...set] } : prev
    })
  }, [productos, contextoFiltro])

  // Conserva la posición del scroll al volver (botón atrás/adelante).
  const scrollKey = `praga_scroll_${location.pathname}${location.search}`

  useEffect(() => {
    return () => {
      try {
        sessionStorage.setItem(scrollKey, String(window.scrollY))
      } catch {
        /* ignore */
      }
    }
  }, [scrollKey])

  useEffect(() => {
    if (navType !== 'POP') return
    let guardado = 0
    try {
      guardado = Number(sessionStorage.getItem(scrollKey) || 0)
    } catch {
      guardado = 0
    }
    if (!guardado) return
    const t = setTimeout(() => window.scrollTo(0, guardado), 80)
    return () => clearTimeout(t)
  }, [scrollKey, navType])

  useEffect(() => {
    let activo = true
    Promise.all([catalogApi.getCategorias(), catalogApi.getSubcategorias()])
      .then(([c, s]) => {
        if (!activo) return
        setCategorias(c)
        setSubcategorias(s)
        setError(null)
      })
      .catch((err) => {
        if (activo) setError(err?.message || 'No pudimos cargar el catálogo. Intenta de nuevo.')
      })
    return () => {
      activo = false
    }
  }, [intento])

  const categoriaActual = categorias.find((c) => c.id === Number(categoria))
  const subcategoriaActual = subcategorias.find((s) => s.id === Number(subcategoria))
  // Tallas para el filtro, según lo que se está viendo:
  //  - Subcategoría elegida  -> solo las tallas de esa subcategoría.
  //  - Categoría elegida     -> tallas de la categoría + las de sus subcategorías
  //                             (ej. Buzos -> S,M,L,XL,2XL; Jeans -> 30,32,34…).
  //  - Página de catálogo ("Ver todo Hombre/Mujer" o "ver todos") -> unión de
  //    todas las categorías y subcategorías de ese catálogo.
  const tallas = useMemo(() => {
    const union = (listas) => {
      const set = new Set()
      for (const arr of listas) {
        if (Array.isArray(arr)) for (const t of arr) set.add(t)
      }
      return [...set]
    }

    if (subcategoriaActual) {
      return ordenarTallas(Array.isArray(subcategoriaActual.tallas) ? subcategoriaActual.tallas : [])
    }
    if (categoriaActual) {
      const subs = subcategorias
        .filter((s) => s.categoria_id === categoriaActual.id)
        .map((s) => s.tallas)
      return ordenarTallas(union([categoriaActual.tallas, ...subs]))
    }

    const cats = catalogo ? categorias.filter((c) => c.catalogo === catalogo) : categorias
    const ids = new Set(cats.map((c) => c.id))
    const subs = subcategorias.filter((s) => ids.has(s.categoria_id)).map((s) => s.tallas)
    return ordenarTallas(union([...cats.map((c) => c.tallas), ...subs]))
  }, [subcategoriaActual, categoriaActual, catalogo, categorias, subcategorias])
  const titulo =
    subcategoriaActual?.nombre ||
    categoriaActual?.nombre ||
    (catalogo === 'mujer' ? 'Catálogo Mujer' : catalogo === 'hombre' ? 'Catálogo Hombre' : 'Catálogo completo')

  const esTenisFiltro = /tenis/i.test(
    `${categoriaActual?.nombre || ''} ${subcategoriaActual?.nombre || ''}`,
  )
  const esChanclasFiltro = /chancla/i.test(
    `${categoriaActual?.nombre || ''} ${subcategoriaActual?.nombre || ''}`,
  )
  const normalizadorFiltro = esTenisFiltro
    ? tallaUSA
    : esChanclasFiltro
      ? tallaChanclas
      : null

  const tallaSeleccionada = normalizadorFiltro ? normalizadorFiltro(talla) : talla

  // En tenis y chanclas se usan las tallas reales de los productos (rangos
  // como 7-8, 8-9, 10-11). Si todavía no han cargado, se usa la configuración
  // como respaldo. Para otras prendas se combinan configuración y productos.
  const opcionesTalla = useMemo(() => {
    const mapa = new Map()
    const agregar = (valor) => {
      const limpio = String(valor ?? '').trim()
      if (limpio && !mapa.has(limpio)) mapa.set(limpio, { valor: limpio, etiqueta: limpio })
    }
    const agregarTalla = (valor) => {
      const limpio = String(valor ?? '').trim()
      if (!limpio) return
      // En chanclas, "6-7/8-9" significa dos rangos. Se muestran por separado
      // para no dejar un botón combinado raro en el filtro.
      if (esChanclasFiltro && limpio.includes('/')) {
        limpio.split('/').forEach((parte) => agregar(parte.trim()))
        return
      }
      agregar(limpio)
    }

    const tallasValidas =
      tallasProducto.contexto === contextoFiltro ? tallasProducto.tallas : []

    if (normalizadorFiltro) {
      const base = tallasValidas.length
        ? tallasValidas
        : tallas.map((t) => normalizadorFiltro(t))
      base.forEach(agregarTalla)
      // Mantiene activa la talla de la URL aunque ya no exista en el filtro.
      agregarTalla(tallaSeleccionada)
    } else {
      tallas.forEach(agregarTalla)
      tallasValidas.forEach(agregarTalla)
    }

    let valores = ordenarTallas([...mapa.keys()])

    // En chanclas, si los productos usan rangos (6-7, 8-9, 10-11), se ocultan
    // los botones sueltos 6, 7, 8, 9... que ya quedan cubiertos por el rango.
    if (esChanclasFiltro) {
      const rangos = valores.filter((valor) => valor.includes('-'))
      if (rangos.length) {
        valores = valores.filter((valor) => {
          if (valor === tallaSeleccionada || valor.includes('-')) return true
          if (!/^\d+([.,]\d+)?$/.test(valor)) return true
          return !rangos.some((rango) => tallasCompatibles(valor, rango))
        })
      }

      // Las chanclas se venden por pares consecutivos: 6-7, 7-8, 8-9,
      // 9-10, 10-11... Se completa la secuencia entre la talla mínima y la
      // máxima que exista en los productos, sin mostrar tallas sueltas.
      const pares = valores
        .map((valor) => valor.match(/^(\d+)-(\d+)$/))
        .filter(Boolean)
        .map((m) => [Number(m[1]), Number(m[2])])
        .filter(([a, b]) => a >= 1 && b <= 20 && b === a + 1)

      if (pares.length) {
        const inicio = Math.min(...pares.map(([a]) => a))
        const fin = Math.max(...pares.map(([, b]) => b))
        if (fin - inicio <= 20) {
          for (let i = inicio; i < fin; i++) {
            const valor = `${i}-${i + 1}`
            if (!mapa.has(valor)) {
              mapa.set(valor, { valor, etiqueta: valor })
            }
          }
          valores = ordenarTallas([...mapa.keys()])
        }
      }
    }

    return valores.map((valor) => mapa.get(valor))
  }, [
    tallas,
    tallasProducto,
    contextoFiltro,
    normalizadorFiltro,
    tallaSeleccionada,
    esChanclasFiltro,
  ])

  // Sin filtros ni búsqueda: mostramos la cuadrícula de categorías
  // (a menos que se pida explícitamente ver todos los productos con ?ver=todos).
  const mostrarCategorias = !catalogo && !categoria && !subcategoria && !q && ver !== 'todos'

  function setQ(valor) {
    const next = new URLSearchParams(searchParams)
    if (valor) next.set('q', valor)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  function setVer(valor) {
    const next = new URLSearchParams(searchParams)
    if (valor) next.set('ver', valor)
    else next.delete('ver')
    setSearchParams(next, { replace: true })
  }

  function setTalla(valor) {
    const next = new URLSearchParams(searchParams)
    if (valor) next.set('talla', valor)
    else next.delete('talla')
    setSearchParams(next, { replace: true })
  }

  const parametros = useMemo(
    () => ({
      catalogo: catalogo || undefined,
      categoria_id: categoria || undefined,
      subcategoria_id: subcategoria || undefined,
      q: q || undefined,
      talla: talla || undefined,
    }),
    [catalogo, categoria, subcategoria, q, talla],
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
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-2">Catálogo</p>
            <h1 className="mt-1 font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
              {titulo}
            </h1>
            {subcategoriaActual && (
              <p className="mt-2 text-sm text-ink-2">· {categoriaActual?.nombre}</p>
            )}
            {mostrarCategorias && (
              <p className="mt-2 max-w-xl text-sm text-ink-2">
                Explora todas las categorías y encuentra lo que buscas por tipo de prenda.
              </p>
            )}
          </div>
          {mostrarCategorias ? (
            <button
              type="button"
              onClick={() => setVer('todos')}
              className="text-sm font-semibold text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Ver todos los productos
            </button>
          ) : (
            !catalogo &&
            !categoria &&
            !subcategoria &&
            !q && (
              <button
                type="button"
                onClick={() => setVer('')}
                className="text-sm font-semibold text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Ver categorías
              </button>
            )
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
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setIntento((n) => n + 1)
              }}
              className="rounded-full border border-red-300 bg-white px-4 py-1.5 font-semibold transition-colors hover:border-red-500 hover:text-red-800"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Filtro por talla */}
        {!mostrarCategorias && opcionesTalla.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-2">
                Filtra por talla{esTenisFiltro || esChanclasFiltro ? ' (US)' : ''}
              </p>
              {(esTenisFiltro || esChanclasFiltro) && (
                <button
                  type="button"
                  onClick={() => setGuiaTallas(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-metal-2 hover:shadow-md active:scale-95"
                >
                  Guía de tallas
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTalla('')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  !talla ? 'bg-ink text-white' : 'border border-line bg-white text-ink-2 hover:border-ink'
                }`}
              >
                Todas
              </button>
              {opcionesTalla.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() =>
                    setTalla(tallaSeleccionada === opcion.valor ? '' : opcion.valor)
                  }
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    tallaSeleccionada === opcion.valor
                      ? 'bg-ink text-white'
                      : 'border border-line bg-white text-ink-2 hover:border-ink'
                  }`}
                >
                  {opcion.etiqueta}
                </button>
              ))}
            </div>
          </div>
        )}

        {mostrarCategorias ? (
          <CatalogoCategorias />
        ) : (
          <CatalogoResultados
            key={`${catalogo}|${categoria}|${subcategoria}|${q}|${talla}|${intento}`}
            parametros={parametros}
            onProductos={setProductos}
          />
        )}
      </div>

      <GuiaTallasModal
        abierta={guiaTallas}
        onClose={() => setGuiaTallas(false)}
        genero={catalogo}
      />
    </>
  )
}