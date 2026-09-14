import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from './icons'

// Banners de la portada. Cada banner tiene su propio fondo (gradiente de marca),
// título, subtítulo y llamado a la acción. Responsive: en móvil se apilan y el
// texto se ajusta; en escritorio se ve la imagen del producto a la derecha.
const SLIDES = [
  {
    tag: 'Nueva colección',
    titulo: 'Premium 1.1',
    subtitulo: 'La línea más brutal de la temporada. Ediciones limitadas con estampado 1.1.',
    cta: { label: 'Ver colección', to: '/catalogo?categoria=3' },
    imagen: '/images/products/camiseta.svg',
    fondo: 'linear-gradient(120deg,#0a0a0a 0%,#1c1c20 55%,#2a2a30 100%)',
  },
  {
    tag: 'Los clásicos',
    titulo: 'Camisetas Originales',
    subtitulo: 'El básico que nunca falla. Algodón premium, tallas S a XXL.',
    cta: { label: 'Comprar ahora', to: '/catalogo?categoria=3&subcategoria=5' },
    imagen: '/images/products/pantalon.svg',
    fondo: 'linear-gradient(120deg,#141414 0%,#0a0a0a 60%,#1f1f24 100%)',
  },
  {
    tag: 'Calzado',
    titulo: 'Tenis & Chanclas',
    subtitulo: 'Numeración real por talla (US-EURO). Stock por talla exacta.',
    cta: { label: 'Ver calzado', to: '/catalogo?categoria=12' },
    imagen: '/images/products/chaqueta.svg',
    fondo: 'linear-gradient(120deg,#1f1f24 0%,#0a0a0a 55%,#26262c 100%)',
  },
]

export default function BannerSlider() {
  const [activo, setActivo] = useState(0)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    if (pausado) return
    const id = window.setInterval(() => {
      setActivo((i) => (i + 1) % SLIDES.length)
    }, 6500)
    return () => window.clearInterval(id)
  }, [pausado])

  function anterior() {
    setActivo((i) => (i - 1 + SLIDES.length) % SLIDES.length)
  }
  function siguiente() {
    setActivo((i) => (i + 1) % SLIDES.length)
  }

  return (
    <section
      className="relative overflow-hidden bg-dark"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      aria-label="Promociones"
    >
      <div className="relative h-[72vh] min-h-[500px] max-h-[760px]">
        {SLIDES.map((slide, i) => {
          const activa = i === activo
          return (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                activa ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
              style={{ background: slide.fondo }}
              aria-hidden={!activa}
            >
              {/* Resplandor decorativo */}
              <div className="pointer-events-none absolute -right-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />

              <div className="mx-auto grid h-full max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
                {/* Texto */}
                <div className="relative z-10 pb-16 pt-10 lg:pb-0 lg:pt-0">
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
                    <span className="h-px w-8 bg-white/40" />
                    {slide.tag}
                  </span>
                  <h2
                    className={`mt-4 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl ${
                      activa ? 'animate-fade-up' : ''
                    }`}
                  >
                    {slide.titulo}
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
                    {slide.subtitulo}
                  </p>
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Link
                      to={slide.cta.to}
                      className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-ink transition-all duration-300 hover:bg-surface-2 hover:shadow-xl active:scale-[0.98]"
                    >
                      {slide.cta.label}
                      <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      to="/catalogo"
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                      Ver catálogo
                    </Link>
                  </div>
                </div>

                {/* Imagen del producto */}
                <div className="pointer-events-none hidden justify-center lg:flex">
                  <img
                    src={slide.imagen}
                    alt=""
                    className={`h-80 w-80 object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)] ${
                      activa ? 'animate-zoom-slow' : 'opacity-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Flechas */}
      <button
        type="button"
        onClick={anterior}
        className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/70 backdrop-blur transition-colors hover:bg-white/15 hover:text-white sm:flex"
        aria-label="Anterior"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={siguiente}
        className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/70 backdrop-blur transition-colors hover:bg-white/15 hover:text-white sm:flex"
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
  )
}