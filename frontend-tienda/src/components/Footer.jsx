import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalogApi } from '../services/api'
import { mapsLink, sedes } from '../utils/sedes'
import BrandLogos from './BrandLogos'
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from './icons'

export default function Footer() {
  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    catalogApi
      .getCategorias()
      .then(setCategorias)
      .catch(() => {})
  }, [])

  const redes = [
    { icon: InstagramIcon, href: 'https://www.instagram.com/praga_medellin_/', label: 'Instagram' },
    { icon: TikTokIcon, href: 'https://www.tiktok.com/@praga_medellin_', label: 'TikTok' },
    { icon: WhatsAppIcon, href: 'https://wa.me/573216573427', label: 'WhatsApp' },
  ]

  return (
    <footer className="bg-dark text-white">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Marca */}
          <div>
            <BrandLogos ring="ring-white/15" />
            <p className="mt-3 font-display text-xl font-semibold leading-none tracking-wide text-white">
              PRAGA
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.3em] text-white/50">
              Medellín
            </p>
            <p className="mt-4 text-sm text-white/60">
              Ropa y accesorios urbanos. 4 sedes en Medellín con el mismo catálogo.
            </p>
            <div className="mt-4 flex gap-2">
              {redes.map((r) => (
                <a
                  key={r.label}
                  href={r.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label={r.label}
                >
                  <r.icon className="h-4 w-4" />
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
                    to={`/catalogo/${c.catalogo}/${c.id}`}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {c.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto y servicio */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Contacto y servicio
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <a
                  href="https://wa.me/573216573427"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-white"
                >
                  WhatsApp: +57 321 6573427
                </a>
              </li>
              <li>
                <a
                  href="mailto:ventas@pragamedellin.com"
                  className="transition-colors hover:text-white"
                >
                  ventas@pragamedellin.com
                </a>
              </li>
              <li className="text-white/50">Horario: lunes a sábado, 9:00 a.m. – 8:00 p.m.</li>
              <li>
                <Link to="/promociones" className="font-medium text-red-400 transition-colors hover:text-red-300">
                  Promociones actuales
                </Link>
              </li>
              <li>
                <Link
                  to="/fragancia-exclusiva"
                  className="font-medium text-white/80 transition-colors hover:text-white"
                >
                  Fragancia Exclusiva de Praga
                </Link>
              </li>
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
            <p className="mt-4 text-xs text-white/40">
              Pago seguro con Wompi · Envíos a todo el país
            </p>
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