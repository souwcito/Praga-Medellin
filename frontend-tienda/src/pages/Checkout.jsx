import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formato } from '../utils/formato'
import Seo from '../components/Seo'
import { ArrowRightIcon } from '../components/icons'

// Checkout base. La integración con el widget de Wompi se agrega en el siguiente
// paso (componente CheckoutWompi.jsx aislado). Por ahora muestra el resumen.
export default function Checkout() {
  const { items, total, count } = useCart()

  return (
    <>
      <Seo title="Finalizar compra" description="Finaliza tu compra en Praga Medellín con pago seguro Wompi." />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
          Finalizar compra
        </h1>
        <p className="mt-2 text-sm text-ink-2">El único método de pago es con Wompi (tarjeta de crédito o débito).</p>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-2">
            Tu carrito está vacío.{' '}
            <Link to="/catalogo" className="font-medium text-ink underline underline-offset-2">
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-2xl border border-line bg-white p-5">
              <h2 className="text-sm font-semibold text-ink">Resumen ({count} artículos)</h2>
              <ul className="mt-3 space-y-2">
                {items.map((item) => (
                  <li key={item.key} className="flex justify-between gap-4 text-sm">
                    <span className="min-w-0 truncate text-ink">
                      {item.nombre}
                      {item.talla ? ` · ${item.talla}` : ''}{' '}
                      <span className="text-ink-2">× {item.cantidad}</span>
                    </span>
                    <span className="shrink-0 font-medium text-ink">
                      {formato(item.precio * item.cantidad)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
                <span className="text-sm font-medium text-ink-2">Total a pagar</span>
                <span className="text-2xl font-bold text-ink">{formato(total)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-line bg-surface-2/50 p-6 text-center">
              <p className="text-sm font-medium text-ink">El pago con Wompi se habilitará en el siguiente paso.</p>
              <Link
                to="/carrito"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-metal-2 active:scale-[0.98]"
              >
                Volver al carrito
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  )
}