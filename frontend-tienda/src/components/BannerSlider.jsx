import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import banner1 from '../assets/imagen-banner-1.webp'
import banner2 from '../assets/imagen-banner-2.webp'
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from './icons'

// Portada editorial PRAGA: hero en pantalla completa con imagen de marca.
// El primer slide es la campaña real de descuentos (hasta 50% en prendas
// seleccionadas) y redirige a /promociones; los demás son editoriales.
const SLIDES = [
  {
    tag: 'Oferta especial',
    titulo: 'Hasta 50% de descuento',
    subtitulo: 'En prendas seleccionadas. Aprovecha las promociones de la temporada.',
    cta: { label: 'Ver promociones', to: '/promociones' },
    imagen: banner1,
  },
  {
    tag: 'Nueva colección',
    titulo: 'Premium 1.1',
    subtitulo: 'La línea más contundente de la temporada. Ediciones limitadas con estampado 1.1.',
    cta: { label: 'Ver colección', to: '/catalogo/hombre/3' },
    imagen: banner2,
  },
  {
    tag: 'Calzado',
    titulo: 'Tenis & Chanclas',
    subtitulo: 'Numeración real por talla (US-EURO). Stock por talla exacta.',
    cta: { label: 'Ver calzado', to: '/catalogo/hombre/12' },
    fondo: 'linear-gradient(120deg,#101010 0%,#26262c 60%,#1f1f24 100%)',
  },
]

export default function BannerSlider() {
  const [activo, setActivo] = useState(0)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    if (pausado) return
    const id = window.setInterval(() => {
      setActivo((i) => (i + 1) % SLIDES.length)
    }, 7000)
    return () => window.clearInterval(id)
  }, [pausado])

  function anterior() {
    setActivo((i) => (i - 1 + SLIDES.length) % SLIDES.length)
  }
  function siguiente() {
    setActivo((i) => (i + 1) % SLIDES.length)
  }

  return (
    <>
      <link rel="preload" as="image" href={banner1} fetchPriority="high" />
      <section
        className="relative overflow-hidden bg-dark"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        aria-label="Promociones y colecciones"
      >
        <div className="relative h-[68vh] min-h-[500px] max-h-[740px]">
          {SLIDES.map((slide, i) => {
            const activa = i === activo
            return (
              <div
                key={i}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  activa ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                style={slide.fondo ? { background: slide.fondo } : undefined}
                aria-hidden={!activa}
              >
                {slide.imagen && (
                  <img
                    src={slide.imagen}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    loading={activa ? 'eager' : 'lazy'}
                    fetchPriority={activa ? 'high' : 'low'}
                    decoding="async"
                  />
                )}
                {/* Overlay para legibilidad */}
                <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink/70" aria-hidden="true" />

                <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                  <div className="max-w-2xl pb-16 pt-14">
                    <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-white">
                      <span className="h-px w-10 bg-metal" />
                      {slide.tag}
                    </span>
                    <h2
                      className={`mt-5 font-display text-[2.6rem] font-bold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl ${
                        activa ? 'animate-fade-up' : ''
                      }`}
                    >
                      {slide.titulo}
                    </h2>
                    <p className="mt-5 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
                      {slide.subtitulo}
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      <Link
                        to={slide.cta.to}
                        className="group inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-semibold tracking-wide text-ink transition-all duration-300 hover:bg-surface-2 hover:shadow-xl active:scale-[0.98]"
                      >
                        {slide.cta.label}
                        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                      <Link
                        to="/catalogo"
                        className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-7 py-3.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/10"
                      >
                        Explorar catálogo
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Flechas (escritorio) */}
        <button
          type="button"
          onClick={anterior}
          className="absolute left-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/70 backdrop-blur transition-colors hover:bg-white/15 hover:text-white sm:flex"
          aria-label="Anterior"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={siguiente}
          className="absolute right-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/70 backdrop-blur transition-colors hover:bg-white/15 hover:text-white sm:flex"
          aria-label="Siguiente"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>

        {/* Puntos */}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActivo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activo ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Ir al banner ${i + 1}`}
            />
          ))}
        </div>
      </section>
    </>
  )
}