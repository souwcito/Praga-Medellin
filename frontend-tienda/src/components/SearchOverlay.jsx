import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { catalogApi } from '../services/api'
import { formato } from '../utils/formato'
import { ArrowRightIcon, SearchIcon, XIcon } from './icons'

// Buscador en vivo: overlay que muestra resultados mientras se escribe.
// Se monta solo cuando está abierto (Header lo renderiza condicionalmente).
export default function SearchOverlay({ cerrar }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [q, setQ] = useState('')
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Carga el catálogo una vez (todas las setState son asíncronas)
  useEffect(() => {
    catalogApi
      .getProductos({})
      .then((p) => {
        setProductos(p)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error al buscar'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') cerrar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cerrar])

  const term = q.trim().toLowerCase()
  const resultados = term
    ? productos
        .filter(
          (p) =>
            p.nombre.toLowerCase().includes(term) ||
            (p.categoria || '').toLowerCase().includes(term),
        )
        .slice(0, 8)
    : []

  function irA(id) {
    cerrar()
    navigate(`/producto/${id}`)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="animate-fade-in absolute inset-0 bg-dark/60" onClick={cerrar} aria-hidden="true" />

      <div className="absolute inset-x-0 top-0 mx-auto mt-4 w-[92%] max-w-xl px-0">
        <div className="animate-scale-in overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Campo de búsqueda */}
          <div className="relative border-b border-line">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2/60" />
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Busca productos, categorías…"
              className="w-full bg-transparent py-4 pl-12 pr-12 text-base text-ink placeholder:text-ink-2/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={cerrar}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Cerrar búsqueda"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Resultados */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center gap-3 px-3 py-4 text-sm text-ink-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
                Cargando…
              </div>
            ) : error ? (
              <p className="px-3 py-4 text-sm text-red-700">{error}</p>
            ) : !term ? (
              <p className="px-3 py-4 text-sm text-ink-2/70">
                Escribe para buscar en todo el catálogo.
              </p>
            ) : resultados.length === 0 ? (
              <p className="px-3 py-4 text-sm text-ink-2/70">
                Sin resultados para “{q}”.
              </p>
            ) : (
              <ul className="space-y-1">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => irA(p.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                    >
                      <img
                        src={p.imagen_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg bg-surface-2 object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{p.nombre}</span>
                        <span className="block text-xs text-ink-2">
                          {p.categoria}
                          {p.subcategoria ? ` · ${p.subcategoria}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-ink">
                        {formato(p.precio)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pie con enlace al catálogo */}
          <div className="border-t border-line p-2">
            <button
              type="button"
              onClick={() => {
                cerrar()
                navigate(`/catalogo${term ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Ver resultados en el catálogo
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}