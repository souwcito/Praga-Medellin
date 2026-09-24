import { useEffect, useState } from 'react'
import { catalogApi } from '../services/api'
import ProductCard from './ProductCard'
import usePolling from '../hooks/usePolling'

const LIMITE = 40
const REFRESCO_MS = 30000

// Resultados del catálogo/promociones: carga paginada (40) + "Cargar más" y
// auto-refresco cada 30s para reflejar productos nuevos, ofertas y stock sin
// recargar la página (merge por id, sin saltos).
// parametros: { catalogo?, categoria_id?, subcategoria_id?, q?, en_oferta? }
export default function CatalogoResultados({ parametros }) {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    catalogApi
      .getProductos({ ...parametros, limit: LIMITE, offset: 0 })
      .then((p) => {
        setProductos(p)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando productos'))
      .finally(() => setLoading(false))
  }, [parametros])

  function cargarMas() {
    setCargandoMas(true)
    catalogApi
      .getProductos({ ...parametros, limit: LIMITE, offset: productos.length })
      .then((p) => setProductos((prev) => [...prev, ...p]))
      .catch((err) => setError(err?.message || 'Error cargando más productos'))
      .finally(() => setCargandoMas(false))
  }

  // Auto-refresco: re-trae la primera página y fusiona con lo ya cargado.
  function refrescar() {
    if (loading) return
    catalogApi
      .getProductos({ ...parametros, limit: LIMITE, offset: 0 })
      .then((nuevos) => {
        setProductos((prev) => {
          const ids = new Set(nuevos.map((p) => p.id))
          const resto = prev.filter((p) => !ids.has(p.id))
          return [...nuevos, ...resto]
        })
      })
      .catch(() => {})
  }

  usePolling(refrescar, REFRESCO_MS, !loading)

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
        {parametros.q
          ? 'Sin resultados para esa búsqueda.'
          : 'No hay productos en esta selección.'}
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