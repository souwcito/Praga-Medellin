import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { catalogApi } from '../services/api'
import BrandLogos from './BrandLogos'
import {
  CartIcon,
  ChevronDownIcon,
  CoinsIcon,
  DashboardIcon,
  LayersIcon,
  LogoutIcon,
  MenuIcon,
  PackageIcon,
  ReceiptIcon,
  UserIcon,
  SwapIcon,
  XIcon,
} from './icons'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/pos', label: 'Punto de venta', icon: CartIcon },
  { to: '/inventario', label: 'Inventario General', icon: LayersIcon },
  { to: '/ventas', label: 'Ventas', icon: ReceiptIcon },
  { to: '/devoluciones', label: 'Devoluciones', icon: SwapIcon },
  { to: '/comisiones', label: 'Comisiones', icon: CoinsIcon },
]

const comercioItems = [
  { to: '/pedidos', label: 'Pedidos online', icon: PackageIcon },
  { to: '/clientes', label: 'Clientes', icon: UserIcon },
]

// Item de navegación del sidebar
function NavItem({ item, onNavigate }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      onClick={onNavigate}
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
}

// Bloque de catálogo (Hombre/Mujer) con sus categorías desplegables
function CatalogoGrupo({ catalogo, titulo, lista, abierto, alternar, onNavigate }) {
  return (
    <div>
      <button
        type="button"
        onClick={() => alternar(catalogo)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white"
      >
        <span className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-metal" />
          {titulo}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
      {abierto && (
        <div className="animate-fade-in mt-1 space-y-0.5 border-l border-white/10 pl-4">
          <Link
            to={`/productos?catalogo=${catalogo}`}
            onClick={onNavigate}
            className="block rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            Ver todo {catalogo === 'hombre' ? 'hombre' : 'mujer'}
          </Link>
          {lista.map((c) => (
            <Link
              key={c.id}
              to={`/productos?catalogo=${catalogo}&categoria=${c.id}`}
              onClick={onNavigate}
              className="block rounded-lg px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              {c.nombre}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Sidebar oscuro de marca + menú. En pantallas pequeñas se convierte en un
// drawer deslizable (hamburguesa en la barra superior); en lg+ queda fijo.
export default function Layout() {
  const { user, logout } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [catalogoAbierto, setCatalogoAbierto] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    catalogApi
      .getCategorias()
      .then(setCategorias)
      .catch(() => {})
  }, [])

  const hombres = categorias.filter((c) => c.catalogo === 'hombre')
  const mujeres = categorias.filter((c) => c.catalogo === 'mujer')

  const iniciales = (user?.nombre || '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  function alternarCatalogo(catalogo) {
    setCatalogoAbierto((prev) => (prev === catalogo ? null : catalogo))
  }

  function cerrarMenu() {
    setMenuAbierto(false)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Barra superior en móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-dark px-4 py-3 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Abrir menú"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <BrandLogos ring="ring-white/30" />
        <span className="w-10" />
      </header>

      {/* Overlay al abrir el drawer en móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 bg-dark/60 lg:hidden"
          onClick={cerrarMenu}
          aria-hidden="true"
        />
      )}

      <div className="flex min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
        {/* Sidebar / drawer */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-dark text-white transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
            menuAbierto ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col items-center gap-1.5 border-b border-white/10 px-5 py-5">
            <BrandLogos ring="ring-white/30" />
            <p className="font-display text-base font-semibold leading-none tracking-wide text-white">
              PRAGA
            </p>
            <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-white/50">
              Medellín
            </p>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
              Catálogos
            </p>
            <CatalogoGrupo
              catalogo="hombre"
              titulo="Catálogo Hombre"
              lista={hombres}
              abierto={catalogoAbierto === 'hombre'}
              alternar={alternarCatalogo}
              onNavigate={cerrarMenu}
            />
            <CatalogoGrupo
              catalogo="mujer"
              titulo="Catálogo Mujer"
              lista={mujeres}
              abierto={catalogoAbierto === 'mujer'}
              alternar={alternarCatalogo}
              onNavigate={cerrarMenu}
            />

            <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
              Gestión
            </p>
            {navItems.map((item) => (
              <NavItem key={item.to} item={item} onNavigate={cerrarMenu} />
            ))}

            <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
              Comercial
            </p>
            {comercioItems.map((item) => (
              <NavItem key={item.to} item={item} onNavigate={cerrarMenu} />
            ))}
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

          {/* Botón cerrar drawer en móvil */}
          <button
            type="button"
            onClick={cerrarMenu}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </aside>

        <main className="min-w-0 flex-1 overflow-x-hidden bg-white p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}