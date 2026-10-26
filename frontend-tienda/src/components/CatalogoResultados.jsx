import { useEffect, useMemo, useState } from 'react'
import { catalogApi } from '../services/api'
import ProductCard from './ProductCard'
import usePolling from '../hooks/usePolling'
import { coincideTalla } from '../utils/tallas'
import { ChevronDownIcon, PlusIcon } from './icons'

const LIMITE = 40
const REFRESCO_MS = 15000

// Caché en sessionStorage por combinación de parámetros: al volver al catálogo
// (atrás/adelante) se conservan los productos ya cargados, así la página tiene
// la misma altura y se puede restaurar la posición del scroll.
function cacheKey(parametros) {
  return `praga_catalogo_${JSON.stringify(parametros)}`
}

function leerCache(key) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function guardarCache(key, valor) {
  try {
    sessionStorage.setItem(key, JSON.stringify(valor))
  } catch {
    /* ignore */
  }
}

// Resultados del catálogo/promociones: carga paginada (40) + "Cargar más" y
// auto-refresco cada 30s para reflejar productos nuevos, ofertas y stock sin
// recargar la página (merge por id, sin saltos).
// parametros: { catalogo?, categoria_id?, subcategoria_id?, q?, en_oferta? }
export default function CatalogoResultados({ parametros, onProductos, emptyMessage }) {
  const key = useMemo(() => cacheKey(parametros), [parametros])
  const inicial = useMemo(() => leerCache(key), [key])

  const [productos, setProductos] = useState(inicial?.productos || [])
  const [loading, setLoading] = useState(!inicial)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [hayMas, setHayMas] = useState(inicial?.hayMas ?? true)
  const [error, setError] = useState(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    // Si ya hay caché para estos parámetros, se usa sin volver a pedir.
    const cache = leerCache(key)
    if (cache && intento === 0) {
      setProductos(cache.productos)
      setHayMas(cache.hayMas)
      setLoading(false)
      onProductos?.(cache.productos)
      return
    }

    setLoading(true)
    setError(null)
    catalogApi
      .getProductos({ ...parametros, limit: LIMITE, offset: 0 })
      .then((p) => {
        setProductos(p)
        // Si la primera página trae menos del límite, no hay más por cargar.
        const mas = p.length >= LIMITE
        setHayMas(mas)
        onProductos?.(p)
        guardarCache(key, { productos: p, hayMas: mas })
        setError(null)
      })
      .catch((err) => {
        setError(err?.message || 'No pudimos cargar los productos. Intenta de nuevo.')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intento])

  function cargarMas() {
    setCargandoMas(true)
    setError(null)
    catalogApi
      .getProductos({ ...parametros, limit: LIMITE, offset: productos.length })
      .then((p) => {
        // Evita duplicados si el backend repite productos (por si ignora el offset).
        const ids = new Set(productos.map((x) => x.id))
        const nuevos = p.filter((x) => !ids.has(x.id))
        // Hay más solo si la respuesta trajo otra página completa Y aportó ítems nuevos.
        const mas = p.length >= LIMITE && nuevos.length > 0
        setProductos((prev) => {
          const siguiente = [...prev, ...nuevos]
          guardarCache(key, { productos: siguiente, hayMas: mas })
          return siguiente
        })
        setHayMas(mas)
        setError(null)
      })
      .catch((err) => {
        setError(err?.message || 'No pudimos cargar más productos. Intenta de nuevo.')
      })
      .finally(() => setCargandoMas(false))
  }

  // Auto-refresco: re-trae la primera página y fusiona con lo ya cargado.
  function refrescar() {
    if (loading) return
    catalogApi
      .getProductos({ ...parametros, limit: LIMITE, offset: 0 })
      .then((nuevos) => {
        setError(null)
        onProductos?.(nuevos)
        setProductos((prev) => {
          const ids = new Set(nuevos.map((p) => p.id))
          const resto = prev.filter((p) => !ids.has(p.id))
          const siguiente = [...nuevos, ...resto]
          guardarCache(key, { productos: siguiente, hayMas })
          return siguiente
        })
      })
      .catch(() => {})
  }

  usePolling(refrescar, REFRESCO_MS, !loading)

  if (error && productos.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <p className="flex-1">{error}</p>
        <button
          type="button"
          onClick={() => setIntento((n) => n + 1)}
          className="rounded-full border border-red-300 bg-white px-4 py-1.5 font-semibold transition-colors hover:border-red-500 hover:text-red-800"
        >
          Reintentar
        </button>
      </div>
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
      <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-line px-6 text-center text-sm text-ink-2/70">
        {parametros.q
          ? 'Sin resultados para esa búsqueda.'
          : emptyMessage || 'No hay productos en esta selección.'}
      </div>
    )
  }

  // Oculta de la web los productos sin stock (p. ej. los apartados por Plan Separe).
  // Si hay una talla seleccionada, exige además que ESA talla tenga stock: un
  // producto con M agotada no debe aparecer al filtrar por M aunque tenga L.
  const tallaFiltro = parametros?.talla
  const visibles = productos.filter((p) => {
    if ((p.stock_total ?? 0) <= 0) return false

    if (tallaFiltro) {
      const variante = (p.variantes || []).find((v) =>
        coincideTalla(v.talla, tallaFiltro, p),
      )
      if ((variante?.stock ?? 0) <= 0) return false
    }

    return true
  })

  return (
    <>
      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => cargarMas()}
            className="rounded-full border border-red-300 bg-white px-4 py-1.5 font-semibold transition-colors hover:border-red-500 hover:text-red-800"
          >
            Reintentar
          </button>
        </div>
      )}
      <p className="mb-4 text-sm text-ink-2">
        {visibles.length} producto{visibles.length === 1 ? '' : 's'} disponibles
      </p>
      {visibles.length === 0 ? (
        <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-line px-6 text-center text-sm text-ink-2/70">
          Volveremos a tener stock pronto.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibles.map((p) => (
            <ProductCard key={p.id} producto={p} />
          ))}
        </div>
      )}

      {hayMas && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={cargarMas}
            disabled={cargandoMas}
            className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-ink via-ink to-metal-2 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-ink/25 ring-1 ring-inset ring-white/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-ink/35 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargandoMas ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Cargando más…
              </>
            ) : (
              <>
                <PlusIcon className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                Cargar más productos
                <ChevronDownIcon className="h-4 w-4 opacity-70 transition-transform duration-300 group-hover:translate-y-0.5" />
              </>
            )}
          </button>
          <p className="text-xs text-ink-2/70">
            Ya viste {productos.length} producto{productos.length === 1 ? '' : 's'} · sigue
            descubriendo
          </p>
        </div>
      )}
    </>
  )
}
