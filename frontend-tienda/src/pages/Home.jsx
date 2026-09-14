import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalogApi } from '../services/api'
import Seo from '../components/Seo'
import BannerSlider from '../components/BannerSlider'
import ProductCard from '../components/ProductCard'
import { ArrowRightIcon, RefreshIcon, ShieldIcon, TruckIcon } from '../components/icons'

const FEATURES = [
  { icon: TruckIcon, titulo: 'Envíos a todo el país', texto: 'Recibe en la puerta de tu casa.' },
  { icon: ShieldIcon, titulo: 'Pago seguro con Wompi', texto: 'Tarjeta de crédito o débito.' },
  { icon: RefreshIcon, titulo: 'Cambios fáciles', texto: 'Coordina en cualquiera de nuestras sedes.' },
]

const SEDES = ['Praga · Aranjuez', 'Praga Woman', 'Praga · Andalucía', 'Akron Store']

export default function Home() {
  const [categorias, setCategorias] = useState([])
  const [destacados, setDestacados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([catalogApi.getCategorias(), catalogApi.getProductos({ destacados: true })])
      .then(([c, p]) => {
        setCategorias(c)
        setDestacados(p)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando la tienda'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Seo
        title="Ropa y accesorios urbanos"
        description="Praga Medellín — Camisetas, buzos, tenis, gorras y más. 4 sedes en Medellín, pago seguro con Wompi."
      />

      {/* 1. Banner slider con CTAs */}
      <BannerSlider />

      {/* 2. Beneficios */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:grid-cols-3 lg:px-8">
          {FEATURES.map((f) => (
            <div key={f.titulo} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{f.titulo}</p>
                <p className="mt-0.5 text-xs text-ink-2">{f.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Categorías */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-ink sm:text-4xl">
              Categorías
            </h2>
            <p className="mt-1 text-sm text-ink-2">Explora todo el catálogo de Praga Medellín.</p>
          </div>
          <Link
            to="/catalogo"
            className="group hidden items-center gap-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink sm:flex"
          >
            Ver todo
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
          {categorias.map((c) => (
            <Link
              key={c.id}
              to={`/catalogo?categoria=${c.id}`}
              className="shrink-0 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink"
            >
              {c.nombre}
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Destacados */}
      <section className="border-t border-line bg-surface-2/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-ink sm:text-4xl">
                Destacados
              </h2>
              <p className="mt-1 text-sm text-ink-2">Lo más vendido de la temporada.</p>
            </div>
            <Link
              to="/catalogo"
              className="group flex items-center gap-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              Ver todo
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl border border-line bg-surface-2" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {destacados.map((p) => (
                <ProductCard key={p.id} producto={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. Banda de sedes */}
      <section className="bg-dark py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            Visítanos en Medellín
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
            El mismo catálogo y el mismo stock en nuestras 4 sedes. Compra en línea y recoge donde quieras.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SEDES.map((s) => (
              <div key={s} className="rounded-xl border border-white/10 bg-white/5 px-4 py-5">
                <p className="text-sm font-semibold">{s}</p>
                <p className="mt-1 text-xs text-white/50">Medellín</p>
              </div>
            ))}
          </div>
          <Link
            to="/catalogo"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-ink transition-all hover:bg-surface-2 active:scale-[0.98]"
          >
            Explorar catálogo
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  )
}