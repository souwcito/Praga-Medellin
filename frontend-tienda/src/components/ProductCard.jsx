import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formato } from '../utils/formato'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import { CartIcon, CheckIcon, HeartIcon, MinusIcon, PlusIcon, XIcon, ZapIcon } from './icons'

// Tarjeta de producto del catálogo/portada.
// Incluye dos acciones: "Agregar al carrito" y "Comprar ahora". Si el producto
// tiene tallas, ambas abren un selector rápido; si es talla única, actúan al instante.
export default function ProductCard({ producto }) {
  const navigate = useNavigate()
  const { agregar, abrirCarrito } = useCart()
  const { esFavorito, toggle } = useFavorites()

  const [modalAbierto, setModalAbierto] = useState(false)
  const [modo, setModo] = useState('agregar') // 'agregar' | 'comprar'
  const [talla, setTalla] = useState(null)
  const [cantidad, setCantidad] = useState(1)

  const favorito = esFavorito(producto.id)

  const disponibles = producto.variantes.filter((v) => v.stock > 0)
  const tallas = disponibles.map((v) => v.talla).filter(Boolean)
  const esTallaUnica = disponibles.length === 1 && disponibles[0].talla === null
  const varianteUnica = esTallaUnica ? disponibles[0] : null

  function abrir(modoNuevo) {
    if (esTallaUnica) {
      // Talla única: acción inmediata, sin modal
      agregar(producto, varianteUnica, 1)
      if (modoNuevo === 'comprar') navigate('/checkout')
      else abrirCarrito()
      return
    }
    setModo(modoNuevo)
    setTalla(null)
    setCantidad(1)
    setModalAbierto(true)
  }

  function confirmar() {
    const variante = disponibles.find((v) => v.talla === talla)
    if (!variante) return
    agregar(producto, variante, cantidad)
    setModalAbierto(false)
    if (modo === 'comprar') navigate('/checkout')
    else abrirCarrito()
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:border-metal hover:shadow-[0_16px_40px_-16px_rgba(10,10,10,0.25)]">
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        <Link to={`/producto/${producto.id}`} className="absolute inset-0">
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            width={600}
            height={600}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>
        {producto.destacado && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Destacado
          </span>
        )}
        <button
          type="button"
          onClick={() => toggle(producto)}
          aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${
            favorito
              ? 'bg-ink text-white'
              : 'bg-white/85 text-ink backdrop-blur hover:text-red-700'
          }`}
        >
          <HeartIcon filled={favorito} className="h-4 w-4" />
        </button>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-2">
          {producto.categoria || 'Praga'}
        </p>
        <Link
          to={`/producto/${producto.id}`}
          className="mt-1 line-clamp-2 text-sm font-medium text-ink transition-colors hover:text-metal-2"
        >
          {producto.nombre}
        </Link>

        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="text-lg font-bold text-ink">{formato(producto.precio)}</span>
          {tallas.length > 0 ? (
            <span className="truncate text-xs text-ink-2">
              {tallas.slice(0, 3).join(' · ')}
              {tallas.length > 3 ? ' …' : ''}
            </span>
          ) : (
            <span className="text-xs text-ink-2">Talla única</span>
          )}
        </div>

        {/* Acciones */}
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => abrir('comprar')}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-ink text-xs font-semibold text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98]"
          >
            <ZapIcon className="h-4 w-4" />
            Comprar ahora
          </button>
          <button
            type="button"
            onClick={() => abrir('agregar')}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-line text-xs font-semibold text-ink-2 transition-all duration-200 hover:border-ink-2/40 hover:bg-surface-2 hover:text-ink active:scale-[0.98]"
          >
            <CartIcon className="h-4 w-4" />
            Agregar al carrito
          </button>
        </div>
      </div>

      {/* Selector rápido de talla */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="animate-fade-in absolute inset-0 bg-dark/70" onClick={() => setModalAbierto(false)} />
          <div className="animate-scale-in relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className="h-12 w-12 rounded-lg bg-surface-2 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{producto.nombre}</p>
                  <p className="text-xs font-semibold text-ink">{formato(producto.precio)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Cerrar"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-2 text-sm font-semibold text-ink">Elige tu talla</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {disponibles.map((v) => (
                <button
                  key={v.talla}
                  type="button"
                  onClick={() => setTalla(v.talla)}
                  className={`min-w-12 rounded-lg border px-3 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                    talla === v.talla
                      ? 'border-ink bg-ink text-white'
                      : 'border-line text-ink hover:border-ink-2/50'
                  }`}
                >
                  {v.talla}
                </button>
              ))}
            </div>

            <div className="mb-5 flex items-center gap-3">
              <span className="text-sm font-medium text-ink">Cantidad</span>
              <div className="flex items-center rounded-lg border border-line">
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  className="flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink active:scale-90"
                  aria-label="Disminuir"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="w-9 text-center text-sm font-semibold text-ink">{cantidad}</span>
                <button
                  type="button"
                  onClick={() => setCantidad((c) => c + 1)}
                  className="flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink active:scale-90"
                  aria-label="Aumentar"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={confirmar}
              disabled={talla === null}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckIcon className="h-5 w-5" />
              {modo === 'comprar' ? 'Comprar ahora' : 'Agregar al carrito'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}