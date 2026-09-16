import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formato } from '../utils/formato'
import Seo from '../components/Seo'
import { ArrowRightIcon, CartIcon, MinusIcon, PlusIcon, TrashIcon } from '../components/icons'

export default function Carrito() {
  const { items, cambiarCantidad, quitar, vaciar, total, count } = useCart()

  return (
    <>
      <Seo title="Carrito de compras" description="Revisa tu carrito de compras en Praga Medellín." />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
              Carrito
            </h1>
            <p className="mt-2 text-sm text-ink-2">
              {count} {count === 1 ? 'artículo' : 'artículos'} en tu compra.
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={vaciar}
              className="text-sm font-medium text-ink-2 transition-colors hover:text-red-700"
            >
              Vaciar carrito
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="grid h-72 place-items-center rounded-3xl border border-dashed border-line">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
                <CartIcon className="h-8 w-8 text-ink-2/40" />
              </div>
              <p className="font-medium text-ink">Tu carrito está vacío</p>
              <p className="mt-1 text-sm text-ink-2">Explora el catálogo y agrega lo que más te guste.</p>
              <Link
                to="/catalogo"
                className="group mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-metal-2 active:scale-[0.98]"
              >
                Ir al catálogo
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Artículos */}
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="flex gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:bg-surface-2/40"
                >
                  <img
                    src={item.imagen_url}
                    alt={item.nombre}
                    className="h-24 w-24 shrink-0 rounded-xl bg-surface-2 object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{item.nombre}</p>
                        <p className="mt-0.5 text-xs text-ink-2">
                          {item.talla ? `Talla ${item.talla} · ` : 'Talla única · '}
                          {formato(item.precio)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitar(item.key)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-2/50 transition-colors hover:bg-red-50 hover:text-red-700"
                        aria-label="Quitar del carrito"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-lg border border-line">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.key, item.cantidad - 1)}
                          className="flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink active:scale-90"
                          aria-label="Disminuir"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="w-9 text-center text-sm font-semibold text-ink">{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.key, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock}
                          className="flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink active:scale-90 disabled:opacity-30"
                          aria-label="Aumentar"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-ink">{formato(item.precio * item.cantidad)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen */}
            <aside className="h-fit rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-28">
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink">Resumen</h2>
              <div className="mt-4 space-y-2 border-b border-line pb-4 text-sm">
                <div className="flex justify-between text-ink-2">
                  <span>Subtotal</span>
                  <span className="font-medium text-ink">{formato(total)}</span>
                </div>
                <div className="flex justify-between text-ink-2">
                  <span>Envío</span>
                  <span>Se calcula en el checkout</span>
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm font-medium text-ink-2">Total</span>
                <span className="text-2xl font-bold text-ink">{formato(total)}</span>
              </div>

              <Link
                to="/checkout"
                className="group mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-metal-2 hover:shadow-lg active:scale-[0.98]"
              >
                Finalizar compra
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/catalogo"
                className="mt-3 block text-center text-sm font-medium text-ink-2 transition-colors hover:text-ink"
              >
                Seguir comprando
              </Link>
            </aside>
          </div>
        )}
      </div>
    </>
  )
}