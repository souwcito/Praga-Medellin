import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import logoPraga from '../assets/logo-praga.png'
import {
  CartIcon,
  CoinsIcon,
  DashboardIcon,
  LayersIcon,
  LogoutIcon,
  PackageIcon,
  ReceiptIcon,
} from './icons'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/pos', label: 'Punto de venta', icon: CartIcon },
  { to: '/productos', label: 'Productos', icon: PackageIcon, adminOnly: true },
  { to: '/inventario', label: 'Inventario', icon: LayersIcon },
  { to: '/ventas', label: 'Ventas', icon: ReceiptIcon },
  { to: '/comisiones', label: 'Comisiones', icon: CoinsIcon },
]

// Estructura general del panel: sidebar oscuro (#141414) + contenido en blanco.
export default function Layout() {
  const { user, logout } = useAuth()
  const iniciales = (user?.nombre || '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-dark text-white">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <img
            src={logoPraga}
            alt="Praga Medellín"
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
          <div>
            <p className="font-display text-lg font-semibold leading-tight tracking-wide text-white">
              PRAGA
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.3em] text-white/50">
              Medellín
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
            Menú
          </p>
          {navItems
            .filter((item) => !item.adminOnly || user?.rol === 'admin')
            .map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:translate-x-0.5 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-metal transition-opacity duration-200 ${
                          isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                      {item.label}
                    </>
                  )}
                </NavLink>
              )
            })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
              {iniciales}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user?.nombre}</p>
              <p className="text-xs capitalize text-white/50">{user?.rol}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/25 hover:bg-white/5 hover:text-white active:scale-[0.98]"
          >
            <LogoutIcon className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto bg-white p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}