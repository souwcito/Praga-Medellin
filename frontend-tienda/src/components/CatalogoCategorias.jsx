import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalogApi } from '../services/api'
import { ArrowRightIcon } from './icons'

// Vista de "Catálogo completo": cuadrícula editorial con TODAS las categorías
// reales, agrupadas por catálogo (Hombre, Mujer y Fragancia Exclusiva).
// La portada de cada categoría es la imagen del primer producto con imagen.

const GRUPOS = [
  { catalogo: 'hombre', titulo: 'Hombre' },
  { catalogo: 'mujer', titulo: 'Mujer' },
  { catalogo: 'fragancia', titulo: 'Fragancia Exclusiva' },
]

const FALLBACKS = [
  'linear-gradient(135deg,#101010 0%,#3a3a42 100%)',
  'linear-gradient(135deg,#191919 0%,#4a4a52 100%)',
  'linear-gradient(135deg,#26262c 0%,#101010 100%)',
  'linear-gradient(135deg,#2f2f36 0%,#16161a 100%)',
]

export default function CatalogoCategorias() {
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true
    Promise.all([catalogApi.getCategorias(), catalogApi.getSubcategorias()])
      .then(([cats, subs]) => {
        const data = GRUPOS.map((g) => ({
          ...g,
          categorias: cats
            .filter((c) => c.catalogo === g.catalogo)
            .map((c) => ({
              ...c,
              // Portada elegida en el panel o primer producto con imagen que
              // resuelve la API. Ya no se piden 500 productos solo para esto.
              portada: c.portada_imagen_url || null,
              subcats: subs.filter((s) => s.categoria_id === c.id).length,
            })),
        })).filter((g) => g.categorias.length > 0)
        if (activo) setGrupos(data)
      })
      .catch(() => {})
      .finally(() => {
        if (activo) setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [intento])

  if (loading) {
    return (
      <div className="space-y-12">
        {[0, 1].map((g) => (
          <div key={g}>
            <div className="mb-5 h-7 w-40 animate-pulse rounded bg-surface-2" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-surface-2" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (grupos.length === 0) {
    return (
      <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-line px-6 text-center text-sm text-ink-2/70">
        <div>
          <p>No pudimos cargar las categorías. Revisa tu conexión e intenta de nuevo.</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setIntento((n) => n + 1)
            }}
            className="mt-4 rounded-full border border-line bg-white px-5 py-2 font-semibold text-ink transition-colors hover:border-ink"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-16">
      {grupos.map((g) => {
        const oscuro = g.catalogo === 'fragancia'
        return (
          <section
            key={g.catalogo}
            className={oscuro ? 'rounded-3xl bg-dark px-5 py-10 text-white sm:px-8' : ''}
          >
            <div className="mb-6 flex items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`h-px w-10 ${oscuro ? 'bg-metal' : 'bg-ink/30'}`} />
                <h2
                  className={`font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl ${
                    oscuro ? 'text-white' : 'text-ink'
                  }`}
                >
                  {g.titulo}
                </h2>
              </div>
              <Link
                to={`/catalogo/${g.catalogo}`}
                className={`group hidden items-center gap-1.5 text-sm font-semibold transition-colors sm:flex ${
                  oscuro ? 'text-white/70 hover:text-white' : 'text-ink-2 hover:text-ink'
                }`}
              >
                Ver todo
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {g.categorias.map((c, i) => {
                const to = c.catalogo === 'fragancia' ? '/fragancia-exclusiva' : `/catalogo/${c.catalogo}/${c.id}`
                return (
                  <Link
                    key={c.id}
                    to={to}
                    className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2 shadow-sm ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-xl"
                  >
                    {c.portada ? (
                      <img
                        src={c.portada}
                        alt={c.nombre}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{ background: FALLBACKS[i % FALLBACKS.length] }}
                        aria-hidden="true"
                      />
                    )}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent transition-opacity duration-300 group-hover:from-ink/90"
                      aria-hidden="true"
                    />
                    <span className="absolute right-4 top-4 font-display text-xs font-semibold tracking-[0.2em] text-white/60">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="font-display text-lg font-semibold uppercase leading-tight tracking-wide text-white">
                        {c.nombre}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-white/70 transition-colors group-hover:text-white">
                        {c.subcats > 0 ? `${c.subcats} líneas` : 'Explorar'}
                        <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>

            <Link
              to={`/catalogo/${g.catalogo}`}
              className={`group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors sm:hidden ${
                oscuro ? 'text-white/70' : 'text-ink-2'
              }`}
            >
              Ver todo {g.titulo}
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </section>
        )
      })}
    </div>
  )
}
