import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalogApi } from '../services/api'
import { mapsLink, sedes } from '../utils/sedes'
import Seo from '../components/Seo'
import BannerSlider from '../components/BannerSlider'
import ProductCard from '../components/ProductCard'
import { ArrowRightIcon } from '../components/icons'

export default function Home() {
  const [destacados, setDestacados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    catalogApi
      .getProductos({ destacados: true })
      .then((p) => {
        setDestacados(p.slice(0, 8))
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
        url="https://pragamedellin.com/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Praga Medellín',
            url: 'https://pragamedellin.com/',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://pragamedellin.com/catalogo?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />

      {/* 1. Banner slider con CTAs */}
      <BannerSlider />

      {/* 2. Destacados */}
      <section className="py-12">
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

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

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

      {/* 3. Banda de sedes */}
      <section className="bg-dark py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            Visítanos en Medellín
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
            El mismo catálogo y el mismo stock en nuestras 4 sedes. Compra en línea y recoge donde quieras.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sedes.map((s) => (
              <a
                key={s.nombre}
                href={mapsLink(s.direccion)}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-white/10 bg-white/5 px-4 py-5 transition-colors hover:border-white/25 hover:bg-white/10"
              >
                <p className="text-sm font-semibold">{s.nombre}</p>
                <p className="mt-1 text-xs text-white/50 transition-colors group-hover:text-white/80">
                  {s.direccion} · Ver en Maps
                </p>
              </a>
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