import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalogApi } from '../services/api'
import { mapsLink, sedes } from '../utils/sedes'
import Seo from '../components/Seo'
import BannerSlider from '../components/BannerSlider'
import SectionHeading from '../components/SectionHeading'
import CategoryTiles from '../components/CategoryTiles'
import TrustStrip from '../components/TrustStrip'
import ProductCard from '../components/ProductCard'
import usePolling from '../hooks/usePolling'
import imagenEditorial from '../assets/imagen-banner-2.webp'
import { ArrowRightIcon } from '../components/icons'

export default function Home() {
  const [destacados, setDestacados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    catalogApi
      .getProductos({ destacados: true })
      .then((p) => {
        setDestacados(p.filter((x) => (x.stock_total ?? 0) > 0).slice(0, 8))
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando la tienda'))
      .finally(() => setLoading(false))
  }, [])

  function refrescar() {
    if (loading) return
    catalogApi
      .getProductos({ destacados: true })
      .then((p) => setDestacados(p.filter((x) => (x.stock_total ?? 0) > 0).slice(0, 8)))
      .catch(() => {})
  }

  usePolling(refrescar, 30000, !loading)

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

      {/* 1. Portada editorial (primer slide: oferta hasta 50% -> /promociones) */}
      <BannerSlider />

      {/* 2. Categorías destacadas (datos reales) */}
      <CategoryTiles />

      {/* 3. Novedades (productos reales más recientes con stock) */}
      <section className="container-page pb-16">
        <SectionHeading
          titulo="Novedades"
          sufijo="Lo más reciente del catálogo."
          enlace="/catalogo"
        />

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl border border-line bg-surface-2" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {destacados.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Sección editorial de marca */}
      <section className="bg-dark py-16 text-white">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-metal">
              <span className="h-px w-10 bg-metal" /> Praga Medellín
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">
              Tu estilo.
              <br />
              Tus reglas.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
              Moda y accesorios para expresar tu identidad. El mismo catálogo en 4 sedes de Medellín,
              con disponibilidad real por talla.
            </p>
            <Link
              to="/catalogo"
              className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-semibold tracking-wide text-ink transition-all hover:bg-surface-2 active:scale-[0.98]"
            >
              Explorar colección
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="order-1 lg:order-2">
            <img
              src={imagenEditorial}
              alt="Colección Praga Medellín"
              loading="lazy"
              className="aspect-[4/3] w-full rounded-xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* 5. Confianza y servicio (datos reales) */}
      <TrustStrip />

      {/* 6. Banda de sedes */}
      <section className="py-16">
        <div className="container-page text-center">
          <h2 className="section-title">Visítanos en Medellín</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-2">
            El mismo catálogo y el mismo stock en nuestras 4 sedes. Compra en línea y recoge donde
            quieras.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sedes.map((s) => (
              <a
                key={s.nombre}
                href={mapsLink(s.direccion)}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-line bg-white px-4 py-5 text-left transition-colors hover:border-metal hover:bg-surface-2"
              >
                <p className="text-sm font-semibold text-ink">{s.nombre}</p>
                <p className="mt-1 text-xs text-ink-2">
                  {s.direccion} · Ver en Maps
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}