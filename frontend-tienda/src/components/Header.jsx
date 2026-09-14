import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import logoPraga from '../assets/logo-praga.png'
import { CartIcon, MenuIcon, SearchIcon, XIcon } from './icons'

const NAV = [
  { to: '/', label: 'Inicio' },
  { to: '/catalogo', label: 'Catálogo' },
]

export default function Header() {
  const { count } = useCart()
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <header className="sticky top-0 z-40">
      {/* Barra de anuncio */}
      <div className="bg-ink px-4 py-2 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white">
        Envíos a todo el país · Pago seguro con Wompi
      </div>

      <div className="border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:h-20 lg:px-8">
          {/* Menú móvil + logo */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink md:hidden"
              aria-label="Abrir menú"
            >
              <MenuIcon className="h-6 w-6" />
            </button>

            <Link to="/" className="flex items-center gap-2.5" aria-label="Praga Medellín — inicio">
              <img src={logoPraga} alt="Praga Medellín" className="h-10 w-10 rounded-full object-cover md:h-11 md:w-11" />
              <span className="hidden sm:block">
                <span className="block font-display text-lg font-semibold leading-none tracking-wide text-ink">
                  PRAGA
                </span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.3em] text-ink-2">
                  Medellín
                </span>
              </span>
            </Link>
          </div>

          {/* Navegación escritorio */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-ink text-white' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Acciones */}
          <div className="flex items-center gap-1">
            <Link
              to="/catalogo"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Buscar productos"
            >
              <SearchIcon className="h-5 w-5" />
            </Link>

            <Link
              to="/carrito"
              className="relative flex h-10 items-center gap-2 rounded-lg px-3 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label={`Carrito, ${count} artículos`}
            >
              <CartIcon className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
              <span className="hidden text-sm font-medium lg:block">Carrito</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Menú móvil (drawer) */}
      {menuAbierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="animate-fade-in absolute inset-0 bg-dark/60" onClick={() => setMenuAbierto(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="font-display text-lg font-semibold tracking-wide text-ink">PRAGA</span>
              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
                aria-label="Cerrar menú"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuAbierto(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/carrito"
                onClick={() => setMenuAbierto(false)}
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <CartIcon className="h-5 w-5" />
                Carrito {count > 0 && `(${count})`}
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}