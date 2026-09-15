import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import banner1 from '../assets/imagen-banner-1.jpeg'
import banner2 from '../assets/imagen-banner-2.jpeg'
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from './icons'

// Banners de la portada a pantalla completa (imagen de fondo + overlay oscuro
// para el texto). Cada banner tiene su tag, título, subtítulo y llamado a la acción.
// Responsive: el texto se ajusta en móvil.
const SLIDES = [
  {
    tag: 'Nueva colección',
    titulo: 'Premium 1.1',
    subtitulo: 'La línea más brutal de la temporada. Ediciones limitadas con estampado 1.1.',
    cta: { label: 'Ver colección', to: '/catalogo?categoria=3' },
    imagen: banner1,
  },
  {
    tag: 'Los clásicos',
    titulo: 'Camisetas Originales',
    subtitulo: 'El básico que nunca falla. Algodón premium, tallas S a XXL.',
    cta: { label: 'Comprar ahora', to: '/catalogo?categoria=3&subcategoria=5' },
    imagen: banner2,
  },
  {
    tag: 'Calzado',
    titulo: 'Tenis & Chanclas',
    subtitulo: 'Numeración real por talla (US-EURO). Stock por talla exacta.',
    cta: { label: 'Ver calzado', to: '/catalogo?categoria=12' },
    fondo: 'linear-gradient(120deg,#0a0a0a 0%,#26262c 60%,#1f1f24 100%)',
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
              style={slide.fondo ? { background: slide.fondo } : undefined}
              aria-hidden={!activa}
            >
              {/* Imagen de fondo (si existe): en posición absoluta para que el
                  texto quede encima, sin zoom y sin recorte excesivo */}
              {slide.imagen && (
                <img
                  src={slide.imagen}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              )}

              {/* Texto + llamado a la acción */}
              <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                <div className="max-w-xl pb-20 pt-12 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white">
                    <span className="h-px w-8 bg-white" />
                    {slide.tag}
                  </span>
                  <h2
                    className={`mt-4 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl ${
                      activa ? 'animate-fade-up' : ''
                    }`}
                  >
                    {slide.titulo}
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white sm:text-base">
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