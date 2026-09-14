import { useNavigate } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formato } from '../utils/formato'
import { ArrowRightIcon, CartIcon, MinusIcon, PlusIcon, TrashIcon, XIcon } from './icons'

// Carrito desplegable lateral (slide-over): no redirige a otra página.
// Se abre desde el header o al agregar un producto.
export default function CartDrawer() {
  const navigate = useNavigate()
  const { items, cambiarCantidad, quitar, total, count, cartAbierto, cerrarCarrito } =
    useCart()

  if (!cartAbierto) return null

  function irACheckout() {
    cerrarCarrito()
    navigate('/checkout')
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="animate-fade-in absolute inset-0 bg-dark/60"
        onClick={cerrarCarrito}
        aria-hidden="true"
      />

      <div className="animate-slide-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <CartIcon className="h-5 w-5 text-ink-2" />
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
              Tu carrito
            </h2>
            {count > 0 && (
              <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={cerrarCarrito}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Cerrar carrito"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Artículos */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
                  <CartIcon className="h-7 w-7 text-ink-2/40" />
                </div>
                <p className="text-sm font-medium text-ink-2">Tu carrito está vacío</p>
                <p className="mt-1 text-xs text-ink-2/70">
                  Explora el catálogo y agrega lo que más te guste.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.key} className="flex gap-3 rounded-xl border border-line p-3">
                  <img
                    src={item.imagen_url}
                    alt={item.nombre}
                    className="h-16 w-16 shrink-0 rounded-lg bg-surface-2 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink">{item.nombre}</p>
                      <button
                        type="button"
                        onClick={() => quitar(item.key)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-2/50 transition-colors hover:bg-red-50 hover:text-red-700"
                        aria-label="Quitar del carrito"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-2">
                      {item.talla ? `Talla ${item.talla} · ` : 'Talla única · '}
                      {formato(item.precio)}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-line">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.key, item.cantidad - 1)}
                          className="flex h-8 w-8 items-center justify-center text-ink-2 hover:text-ink active:scale-90"
                          aria-label="Disminuir"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-ink">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.key, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock}
                          className="flex h-8 w-8 items-center justify-center text-ink-2 hover:text-ink active:scale-90 disabled:opacity-30"
                          aria-label="Aumentar"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-ink">
                        {formato(item.precio * item.cantidad)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen */}
        {items.length > 0 && (
          <div className="border-t border-line p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-ink-2">Total</span>
              <span className="text-2xl font-bold text-ink">{formato(total)}</span>
            </div>
            <button
              type="button"
              onClick={irACheckout}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98]"
            >
              Finalizar compra
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={cerrarCarrito}
              className="mt-2 block w-full text-center text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              Seguir comprando
            </button>
          </div>
        )}
      </div>
    </div>
  )
}