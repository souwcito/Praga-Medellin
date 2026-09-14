import { useNavigate } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'
import { formato } from '../utils/formato'
import { ArrowRightIcon, HeartIcon, XIcon } from './icons'

// Lista de deseos desplegable lateral (slide-over): no redirige a otra página.
// Se abre desde el corazón del header.
export default function FavoritesDrawer() {
  const navigate = useNavigate()
  const { favoritos, quitar, count, drawerAbierto, cerrarDrawer } = useFavorites()

  if (!drawerAbierto) return null

  function irA(id) {
    cerrarDrawer()
    navigate(`/producto/${id}`)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="animate-fade-in absolute inset-0 bg-dark/60"
        onClick={cerrarDrawer}
        aria-hidden="true"
      />

      <div className="animate-slide-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <HeartIcon className="h-5 w-5 text-ink-2" />
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
              Mis favoritos
            </h2>
            {count > 0 && (
              <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={cerrarDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Cerrar favoritos"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4">
          {favoritos.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
                  <HeartIcon className="h-7 w-7 text-ink-2/40" />
                </div>
                <p className="text-sm font-medium text-ink-2">Aún no tienes favoritos</p>
                <p className="mt-1 text-xs text-ink-2/70">
                  Toca el corazón en un producto para guardarlo aquí.
                </p>
                <button
                  type="button"
                  onClick={cerrarDrawer}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-metal-2 active:scale-[0.98]"
                >
                  Seguir explorando
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {favoritos.map((f) => (
                <div key={f.id} className="flex gap-3 rounded-xl border border-line p-3">
                  <button
                    type="button"
                    onClick={() => irA(f.id)}
                    className="shrink-0"
                    aria-label={`Ver ${f.nombre}`}
                  >
                    <img
                      src={f.imagen_url}
                      alt={f.nombre}
                      className="h-16 w-16 rounded-lg bg-surface-2 object-cover"
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => irA(f.id)}
                      className="block w-full truncate text-left text-sm font-medium text-ink transition-colors hover:text-metal-2"
                    >
                      {f.nombre}
                    </button>
                    <p className="mt-0.5 text-xs text-ink-2">
                      {f.categoria}
                      {f.subcategoria ? ` · ${f.subcategoria}` : ''}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">{formato(f.precio)}</span>
                      <button
                        type="button"
                        onClick={() => quitar(f.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/60 transition-colors hover:bg-red-50 hover:text-red-700"
                        aria-label="Quitar de favoritos"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie */}
        {favoritos.length > 0 && (
          <div className="border-t border-line p-4">
            <button
              type="button"
              onClick={() => {
                cerrarDrawer()
                navigate('/catalogo')
              }}
              className="group flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              Explorar catálogo
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}