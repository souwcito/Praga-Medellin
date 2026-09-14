import { Link } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'
import Seo from '../components/Seo'
import ProductCard from '../components/ProductCard'
import { ArrowRightIcon, HeartIcon } from '../components/icons'

export default function Favoritos() {
  const { favoritos } = useFavorites()

  return (
    <>
      <Seo
        title="Mis favoritos"
        description="Los productos que marcaste como favoritos en Praga Medellín."
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
            Mis favoritos
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            {favoritos.length} {favoritos.length === 1 ? 'producto guardado' : 'productos guardados'}.
          </p>
        </div>

        {favoritos.length === 0 ? (
          <div className="grid h-72 place-items-center rounded-3xl border border-dashed border-line">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
                <HeartIcon className="h-8 w-8 text-ink-2/40" />
              </div>
              <p className="font-medium text-ink">Aún no tienes favoritos</p>
              <p className="mt-1 text-sm text-ink-2">
                Toca el corazón en un producto para guardarlo aquí.
              </p>
              <Link
                to="/catalogo"
                className="group mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-metal-2 active:scale-[0.98]"
              >
                Explorar catálogo
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {favoritos.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}