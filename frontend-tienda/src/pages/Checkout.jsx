import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { pedidosApi } from '../services/api'
import { formato } from '../utils/formato'
import Seo from '../components/Seo'
import {
  AlertIcon,
  ArrowRightIcon,
  CartIcon,
  CheckIcon,
  XIcon,
} from '../components/icons'

const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-2/50 transition-colors focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

// Checkout web: datos del cliente + resumen + pago con el widget de Wompi.
// Flujo: 1) POST /pedidos (se crea pedido y cliente, total se recalcula en el
// servidor) → 2) GET config del widget (firma de integridad calculada en el
// backend) → 3) widget de Wompi → 4) POST confirmar (valida en Wompi y notifica).
export default function Checkout() {
  const { items, total, count, vaciar } = useCart()

  const [cliente, setCliente] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: 'Medellín',
    documento: '',
  })
  const [creando, setCreando] = useState(false)
  const [pagoAbierto, setPagoAbierto] = useState(false)
  const [error, setError] = useState(null)
  const [pedido, setPedido] = useState(null) // resultado del pedido pagado
  const [intentando, setIntentando] = useState(false)

  function setCampo(campo, valor) {
    setCliente((c) => ({ ...c, [campo]: valor }))
    setError(null)
  }

  const formOk =
    cliente.nombre.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)

  async function iniciarPago() {
    if (!formOk || items.length === 0 || creando) return
    setCreando(true)
    setError(null)
    try {
      // 1) Crea el pedido y el cliente; vuelve con total real y número.
      const pedidoCreado = await pedidosApi.create({
        cliente,
        items: items.map((i) => ({
          producto_id: i.producto_id,
          talla: i.talla || undefined,
          cantidad: i.cantidad,
        })),
      })

      // 2) Config del widget (llave pública + firma, sin secretos).
      const wompi = await pedidosApi.wompiConfig(pedidoCreado.numero)

      // 3) Widget de Wompi.
      await abrirWidget(pedidoCreado, wompi)
    } catch (err) {
      setError(err?.error || err?.message || 'No se pudo iniciar el pago')
    } finally {
      setCreando(false)
    }
  }

  function abrirWidget(pedidoCreado, wompi) {
    return new Promise((resolve, reject) => {
      const cargarScript = () =>
        new Promise((res, rej) => {
          if (document.querySelector('script[data-wompi-widget]')) return res()
          const s = document.createElement('script')
          s.src = wompi.widget_url
          s.async = true
          s.dataset.wompiWidget = '1'
          s.onload = () => res()
          s.onerror = () => rej(new Error('No se pudo cargar la pasarela de pago'))
          document.body.appendChild(s)
        })

      // Espera (con reintento) hasta que el script exponga el constructor.
      const esperarGlobal = () =>
        new Promise((res) => {
          if (window.WidgetCheckout) return res(true)
          let intentos = 0
          const t = window.setInterval(() => {
            intentos += 1
            if (window.WidgetCheckout) {
              window.clearInterval(t)
              res(true)
            } else if (intentos >= 20) {
              window.clearInterval(t)
              res(false)
            }
          }, 100)
        })

      cargarScript()
        .then(() => esperarGlobal())
        .then((listo) => {
          if (!listo) {
            setError('La pasarela de pago no está disponible ahora.')
            return reject(new Error('Wompi no disponible'))
          }

          const WidgetCheckout = window.WidgetCheckout || window.Widget
          setIntentando(true)
          setPagoAbierto(true)

          const checkout = new WidgetCheckout({
            publicKey: wompi.public_key,
            currency: wompi.currency,
            amountInCents: wompi.amount_in_cents,
            reference: wompi.reference,
            signature: { integrity: wompi.signature },
            language: 'es',
            customerData: {
              email: cliente.email,
              fullName: cliente.nombre,
              ...(cliente.telefono
                ? { phoneNumber: cliente.telefono, phoneNumberPrefix: '+57' }
                : {}),
              ...(cliente.documento ? { legalId: cliente.documento, legalIdType: 'CC' } : {}),
            },
          })

          checkout.open(async (result) => {
            setPagoAbierto(false)
            setIntentando(false)

            const transactionId = result?.transaction?.id
            const status = result?.transaction?.status

            if (status !== 'APPROVED') {
              setError(
                status === 'PENDING'
                  ? 'El pago quedó pendiente. Te notificaremos cuando se confirme.'
                  : 'El pago no fue aprobado. Inténtalo de nuevo.',
              )
              return resolve()
            }

            try {
              // Confirmación validada en el servidor (no se confía en el navegador).
              const confirmado = await pedidosApi.confirmar(wompi.reference, {
                wompi_transaction_id: transactionId,
              })
              vaciar()
              setPedido(confirmado)
              resolve()
            } catch (e) {
              setError(e?.error || e?.message || 'El pago fue aprobado pero no se pudo confirmar')
              reject(e)
            }
          })
        })
        .catch((e) => {
          setError(e?.message || 'No se pudo iniciar el pago')
          reject(e)
        })
    })
  }

  if (pedido) {
    return (
      <>
        <Seo title="Compra completada" noindex />
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckIcon className="h-8 w-8 text-emerald-700" />
            </div>
            <h1 className="mt-5 font-display text-3xl font-bold uppercase tracking-tight text-ink sm:text-4xl">
              ¡Compra aprobada!
            </h1>
            <p className="mt-3 text-sm text-ink-2">
              Tu pedido <strong className="text-ink">{pedido.numero}</strong> fue confirmado. Te enviamos
              la confirmación a <strong className="text-ink">{cliente.email}</strong> y el equipo ya está
              alistándolo.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3 rounded-xl bg-surface-2 px-4 py-3 text-sm">
              <span className="text-ink-2">Total pagado</span>
              <span className="text-lg font-bold text-ink">{formato(pedido.total)}</span>
            </div>
            <Link
              to="/catalogo"
              className="btn-primary mx-auto mt-6 !px-8"
            >
              Seguir explorando
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Seo title="Finalizar compra" description="Finaliza tu compra con pago seguro Wompi." noindex />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-2">Checkout</p>
          <h1 className="mt-1 font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
            Finalizar compra
          </h1>
          <p className="mt-2 text-sm text-ink-2">Pago seguro con Wompi (tarjeta de crédito o débito).</p>
        </div>

        {error && (
          <div className="animate-fade-in mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-2">
            Tu carrito está vacío.{' '}
            <Link to="/catalogo" className="font-medium text-ink underline underline-offset-2">
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
              {/* Datos del cliente */}
              <div className="rounded-2xl border border-line bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold text-ink">Datos de entrega</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Nombre completo *</span>
                    <input value={cliente.nombre} onChange={(e) => setCampo('nombre', e.target.value)} placeholder="Tu nombre" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Email *</span>
                    <input type="email" value={cliente.email} onChange={(e) => setCampo('email', e.target.value)} placeholder="tucorreo@ejemplo.com" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Teléfono</span>
                    <input value={cliente.telefono} onChange={(e) => setCampo('telefono', e.target.value)} placeholder="300 000 0000" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Cédula</span>
                    <input value={cliente.documento} onChange={(e) => setCampo('documento', e.target.value)} placeholder="Número de cédula" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Ciudad</span>
                    <input value={cliente.ciudad} onChange={(e) => setCampo('ciudad', e.target.value)} className={inputCls} />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Dirección</span>
                    <input value={cliente.direccion} onChange={(e) => setCampo('direccion', e.target.value)} placeholder="Dirección de envío o recogida en sede" className={inputCls} />
                  </label>
                </div>
              </div>

              {/* Resumen */}
              <div className="rounded-2xl border border-line bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-ink">Resumen ({count} artículos)</h2>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.key} className="flex items-start justify-between gap-2 text-sm">
                      <span className="min-w-0">
                        <span className="line-clamp-2 block text-ink">{item.nombre}</span>
                        <span className="text-xs text-ink-2">
                          {item.talla ? `Talla ${item.talla} · ` : ''}× {item.cantidad}
                        </span>
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

                <button
                  type="button"
                  onClick={iniciarPago}
                  disabled={!formOk || creando}
                  className="btn-primary mt-5 w-full !py-3.5"
                >
                  {creando ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Preparando pago…
                    </>
                  ) : (
                    <>
                      <CartIcon className="h-5 w-5" />
                      Pagar con Wompi
                    </>
                  )}
                </button>
                {!formOk && (
                  <p className="mt-2 text-center text-xs text-ink-2/70">
                    Completa tu nombre y un email válido para continuar.
                  </p>
                )}
                <p className="mt-3 text-center text-[11px] text-ink-2/60">
                  Al pagar aceptas las condiciones de venta. En sandbox se rechazan pagos reales.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Overlay mientras se abre el widget */}
      {(pagoAbierto || intentando) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-dark/60 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm text-ink shadow-2xl">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
            Abriendo la pasarela de pago…
            <button
              type="button"
              onClick={() => setPagoAbierto(false)}
              className="ml-2 rounded-lg p-1 text-ink-2/50 hover:bg-surface-2 hover:text-ink"
              aria-label="Cerrar"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}