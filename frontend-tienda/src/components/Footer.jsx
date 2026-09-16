import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalogApi } from '../services/api'
import { mapsLink, sedes } from '../utils/sedes'
import logoPraga from '../assets/logo-praga.png'
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from './icons'

export default function Footer() {
  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    catalogApi
      .getCategorias()
      .then(setCategorias)
      .catch(() => {})
  }, [])

  return (
    <footer className="bg-dark text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Marca */}
          <div>
            <div className="flex items-center gap-3">
              <img src={logoPraga} alt="Praga Medellín" className="h-12 w-12 rounded-full object-cover" />
              <div>
                <p className="font-display text-xl font-semibold leading-none tracking-wide text-white">
                  PRAGA
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.3em] text-white/50">
                  Medellín
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/60">
              Ropa y accesorios urbanos. 4 sedes en Medellín con el mismo catálogo.
            </p>
            <div className="mt-4 flex gap-2">
              {[InstagramIcon, FacebookIcon, WhatsAppIcon].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label="Red social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Categorías */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Categorías
            </h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
              {categorias.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/catalogo?categoria=${c.id}`}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {c.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ayuda */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Ayuda</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-white/70 transition-colors hover:text-white">Envíos y entregas</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-white/70 transition-colors hover:text-white">Cambios y devoluciones</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-white/70 transition-colors hover:text-white">Pago seguro con Wompi</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-white/70 transition-colors hover:text-white">Términos y condiciones</a></li>
            </ul>
          </div>

          {/* Sedes */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Nuestras sedes
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              {sedes.map((s) => (
                <li key={s.nombre}>
                  <a
                    href={mapsLink(s.direccion)}
                    target="_blank"
                    rel="noreferrer"
                    className="group block transition-colors hover:text-white"
                  >
                    <span className="block font-medium">{s.nombre}</span>
                    <span className="block text-xs text-white/50 transition-colors group-hover:text-white/80">
                      {s.direccion} · Ver en Maps
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Praga Medellín. Todos los derechos reservados.</p>
          <p>Hecho con pasión en Medellín, Colombia.</p>
        </div>
      </div>
    </footer>
  )
}