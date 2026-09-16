import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { catalogApi } from '../services/api'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import logoPraga from '../assets/logo-praga.png'
import SearchOverlay from './SearchOverlay'
import { CartIcon, ChevronDownIcon, HeartIcon, MenuIcon, SearchIcon, XIcon } from './icons'

export default function Header() {
  const { count, abrirCarrito } = useCart()
  const { count: favCount, abrirDrawer } = useFavorites()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [busquedaAbierta, setBusquedaAbierta] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [expandida, setExpandida] = useState(null) // categoria id con subcats abiertas
  const [catalogoAbierto, setCatalogoAbierto] = useState(null) // 'hombre' | 'mujer' | null

  useEffect(() => {
    Promise.all([catalogApi.getCategorias(), catalogApi.getSubcategorias()])
      .then(([c, s]) => {
        setCategorias(c)
        setSubcategorias(s)
      })
      .catch(() => {})
  }, [])

  function cerrar() {
    setMenuAbierto(false)
    setExpandida(null)
    setCatalogoAbierto(null)
  }

  function irA(path) {
    cerrar()
    navigate(path)
  }

  function clicCatalogo(catalogo) {
    setCatalogoAbierto((prev) => (prev === catalogo ? null : catalogo))
  }

  // Categoría sin subcategorías navega directo; con subcategorías despliega.
  function clicCategoria(cat, catalogo) {
    const subs = subcategorias.filter((s) => s.categoria_id === cat.id)
    if (subs.length === 0) {
      irA(`/catalogo?catalogo=${catalogo}&categoria=${cat.id}`)
    } else {
      setExpandida((prev) => (prev === cat.id ? null : cat.id))
    }
  }

  return (
    <header className="sticky top-0 z-40">
      {/* Barra de anuncio */}
      <div className="bg-ink px-4 py-2 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white">
        Envíos a todo el país · Pago seguro con Wompi
      </div>

      <div className="border-b border-line bg-white/95 backdrop-blur">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 md:h-20 lg:px-8">
          {/* Menú hamburguesa (izquierda) */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface-2"
              aria-label="Abrir menú de categorías"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Logo centrado: solo el logo, más grande (el header no crece) */}
          <Link
            to="/"
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
            aria-label="Praga Medellín — inicio"
          >
            <img
              src={logoPraga}
              alt="Praga Medellín"
              className="h-16 w-16 rounded-full object-cover md:h-20 md:w-20"
            />
          </Link>

          {/* Acciones (derecha) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBusquedaAbierta(true)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Buscar productos"
            >
              <SearchIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={abrirDrawer}
              className="relative flex h-11 w-11 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label={`Abrir favoritos, ${favCount} artículos`}
            >
              <HeartIcon className="h-5 w-5" />
              {favCount > 0 && (
                <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">
                  {favCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={abrirCarrito}
              className="relative flex h-11 items-center gap-2 rounded-lg px-3 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label={`Abrir carrito, ${count} artículos`}
            >
              <CartIcon className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
              <span className="hidden text-sm font-medium lg:block">Carrito</span>
            </button>
          </div>
        </div>
      </div>

      {/* Menú lateral de catálogos */}
      {menuAbierto && (
        <div className="fixed inset-0 z-50">
          <div className="animate-fade-in absolute inset-0 bg-dark/60" onClick={cerrar} aria-hidden="true" />
          <div className="animate-slide-left absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-2xl">
            {/* Encabezado del menú */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <img src={logoPraga} alt="Praga Medellín" className="h-9 w-9 rounded-full object-cover" />
                <div>
                  <p className="font-display text-base font-semibold leading-none tracking-wide text-ink">PRAGA</p>
                  <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-ink-2">Medellín</p>
                </div>
              </div>
              <button
                type="button"
                onClick={cerrar}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Cerrar menú"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido navegable */}
            <nav className="flex-1 overflow-y-auto pb-6">
              <div className="border-b border-line px-3 py-2">
                <button
                  type="button"
                  onClick={() => irA('/')}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  Inicio
                </button>
              </div>

              {/* Catálogo Hombre y Catálogo Mujer */}
              {['hombre', 'mujer'].map((catalogo) => {
                const abierto = catalogoAbierto === catalogo
                const cats = categorias.filter((c) => c.catalogo === catalogo)
                return (
                  <div key={catalogo}>
                    <button
                      type="button"
                      onClick={() => clicCatalogo(catalogo)}
                      className={`flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-semibold transition-colors ${
                        abierto ? 'bg-surface-2 text-ink' : 'text-ink hover:bg-surface-2'
                      }`}
                    >
                      {catalogo === 'hombre' ? 'Catálogo Hombre' : 'Catálogo Mujer'}
                      <ChevronDownIcon
                        className={`h-4 w-4 shrink-0 text-ink-2 transition-transform duration-200 ${
                          abierto ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {abierto && (
                      <div className="animate-fade-in bg-surface-2/40 pb-3">
                        <Link
                          to={`/catalogo?catalogo=${catalogo}`}
                          onClick={cerrar}
                          className="block px-8 py-2 text-sm font-medium text-ink transition-colors hover:text-metal-2"
                        >
                          Ver todo {catalogo === 'hombre' ? 'hombre' : 'mujer'}
                        </Link>
                        <div className="divide-y divide-line/60">
                          {cats.map((cat) => {
                            const subs = subcategorias.filter((s) => s.categoria_id === cat.id)
                            const subAbierta = expandida === cat.id
                            return (
                              <div key={cat.id}>
                                <button
                                  type="button"
                                  onClick={() => clicCategoria(cat, catalogo)}
                                  className={`flex w-full items-center justify-between px-8 py-2.5 text-left text-sm transition-colors ${
                                    subAbierta ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink'
                                  }`}
                                >
                                  {cat.nombre}
                                  {subs.length > 0 && (
                                    <ChevronDownIcon
                                      className={`h-3.5 w-3.5 text-ink-2/60 transition-transform duration-200 ${
                                        subAbierta ? 'rotate-180' : ''
                                      }`}
                                    />
                                  )}
                                </button>
                                {subAbierta && (
                                  <div className="space-y-0.5 pl-4">
                                    {subs.map((s) => (
                                      <Link
                                        key={s.id}
                                        to={`/catalogo?catalogo=${catalogo}&categoria=${cat.id}&subcategoria=${s.id}`}
                                        onClick={cerrar}
                                        className="block px-8 py-1.5 text-sm text-ink-2/80 transition-colors hover:text-ink"
                                      >
                                        {s.nombre}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>

            {/* Pie del menú */}
            <div className="border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  cerrar()
                  abrirCarrito()
                }}
                className="flex items-center gap-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
              >
                <CartIcon className="h-5 w-5" />
                Carrito {count > 0 && `(${count})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buscador en vivo */}
      {busquedaAbierta && <SearchOverlay cerrar={() => setBusquedaAbierta(false)} />}
    </header>
  )
}