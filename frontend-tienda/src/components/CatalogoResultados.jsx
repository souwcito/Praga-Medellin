import { useEffect, useState } from 'react'
import { catalogApi } from '../services/api'
import ProductCard from './ProductCard'
import usePolling from '../hooks/usePolling'
import { ChevronDownIcon, PlusIcon } from './icons'

const LIMITE = 40
const REFRESCO_MS = 30000

// Resultados del catálogo/promociones: carga paginada (40) + "Cargar más" y
// auto-refresco cada 30s para reflejar productos nuevos, ofertas y stock sin
// recargar la página (merge por id, sin saltos).
// parametros: { catalogo?, categoria_id?, subcategoria_id?, q?, en_oferta? }
export default function CatalogoResultados({ parametros, onProductos, emptyMessage }) {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [hayMas, setHayMas] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    catalogApi
      .getProductos({ ...parametros, limit: LIMITE, offset: 0 })
      .then((p) => {
        setProductos(p)
        // Si la primera página trae menos del límite, no hay más por cargar.
        setHayMas(p.length >= LIMITE)
        onProductos?.(p)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando productos'))
      .finally(() => setLoading(false))
  }, [parametros, onProductos])

  function cargarMas() {
    setCargandoMas(true)
    catalogApi
      .getProductos({ ...parametros, limit: LIMITE, offset: productos.length })
      .then((p) => {
        // Evita duplicados si el backend repite productos (por si ignora el offset).
        const ids = new Set(productos.map((x) => x.id))
        const nuevos = p.filter((x) => !ids.has(x.id))
        setProductos((prev) => [...prev, ...nuevos])
        // Hay más solo si la respuesta trajo otra página completa Y aportó ítems nuevos.
        setHayMas(p.length >= LIMITE && nuevos.length > 0)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando más productos'))
      .finally(() => setCargandoMas(false))
  }

  // Auto-refresco: re-trae la primera página y fusiona con lo ya cargado.
  function refrescar() {
    if (loading) return
    catalogApi
      .getProductos({ ...parametros, limit: LIMITE, offset: 0 })
      .then((nuevos) => {
        onProductos?.(nuevos)
        setProductos((prev) => {
          const ids = new Set(nuevos.map((p) => p.id))
          const resto = prev.filter((p) => !ids.has(p.id))
          return [...nuevos, ...resto]
        })
      })
      .catch(() => {})
  }

  usePolling(refrescar, REFRESCO_MS, !loading)

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
      <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-line px-6 text-center text-sm text-ink-2/70">
        {parametros.q
          ? 'Sin resultados para esa búsqueda.'
          : emptyMessage || 'No hay productos en esta selección.'}
      </div>
    )
  }

  // Oculta de la web los productos sin stock (p. ej. los apartados por Plan Separe).
  const visibles = productos.filter((p) => (p.stock_total ?? 0) > 0)

  return (
    <>
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