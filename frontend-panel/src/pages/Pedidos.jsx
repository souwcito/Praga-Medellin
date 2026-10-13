import { useState } from 'react'
import { usePedidos } from '../hooks/useData'
import ProductImage from '../components/ProductImage'
import { AlertIcon, CartIcon, ChevronDownIcon } from '../components/icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const ESTADOS = {
  nuevo: { label: 'Nuevo', cls: 'border-sky-200 bg-sky-50 text-sky-700' },
  pagado: { label: 'Pagado', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  enviado: { label: 'Enviado', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  entregado: { label: 'Entregado', cls: 'border-line bg-surface-2 text-ink' },
}

function ChipEstado({ estado }) {
  const e = ESTADOS[estado] || ESTADOS.nuevo
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${e.cls}`}>
      {e.label}
    </span>
  )
}

export default function Pedidos() {
  const { data, isLoading: loading, isError, error: errorRaw } = usePedidos()
  const pedidos = data?.data || []
  const error = errorRaw?.message || (isError ? 'Error cargando pedidos' : null)
  const [abiertaId, setAbiertaId] = useState(null)

  return (
    <div className="animate-fade-up mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Pedidos online
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          Los pedidos pagados en el sitio web con su información completa.
        </p>
      </div>

      {error && (
        <div className="animate-fade-in mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-surface-2" />
      ) : pedidos.length === 0 ? (
        <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-line">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
              <CartIcon className="h-8 w-8 text-ink-2/40" />
            </div>
            <p className="font-medium text-ink">Aún no hay pedidos online</p>
            <p className="mt-1 text-sm text-ink-2">
              Cuando un cliente pague en el sitio web, su pedido aparecerá aquí.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {pedidos.map((p) => {
            const abierta = abiertaId === p.id
            return (
              <li key={p.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                <button
                  type="button"
                  onClick={() => setAbiertaId(abierta ? null : p.id)}
                  className="grid w-full grid-cols-[7rem_1fr_9rem_6rem_2.5rem] items-center gap-4 px-5 py-3 text-left text-sm transition-colors hover:bg-surface-2/40"
                >
                  <span className="font-semibold text-ink">{p.numero}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{p.cliente.nombre}</span>
                    <span className="block truncate text-xs text-ink-2">{p.cliente.email}</span>
                  </span>
                  <span className="truncate text-ink-2">
                    {new Date(p.fecha).toLocaleString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-right font-semibold text-ink">{formato(p.total)}</span>
                  <span className="justify-self-center">
                    <ChevronDownIcon
                      className={`h-4 w-4 text-ink-2/70 transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`}
                    />
                  </span>
                </button>

                {abierta && (
                  <div className="animate-fade-in border-t border-line bg-surface-2/40 px-5 py-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                        Detalle del pedido
                      </p>
                      <ChipEstado estado={p.estado} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {/* Ítems */}
                      <div className="rounded-xl border border-line bg-white p-3">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
                          Productos
                        </p>
                        <ul className="space-y-2">
                          {(p.items || []).map((it, idx) => (
                            <li
                              key={`${it.variante_id}-${idx}`}
                              className="flex items-center gap-3 rounded-lg border border-line bg-surface-2/30 p-2"
                            >
                              <ProductImage
                                src={it.imagen_url}
                                alt={it.nombre}
                                className="h-12 w-12 rounded-lg"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-ink">{it.nombre}</p>
                                <p className="text-xs text-ink-2">
                                  {it.talla ? `Talla ${it.talla} · ` : ''}
                                  {it.cantidad} × {formato(it.precio_unitario)}
                                </p>
                                {it.origen && (
                                  <p className="text-xs font-medium text-emerald-700">
                                    Sale de: {it.origen}
                                  </p>
                                )}
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-ink">
                                {formato(it.subtotal)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Cliente + pago */}
                      <div className="space-y-4">
                        <div className="rounded-xl border border-line bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
                            Cliente
                          </p>
                          <dl className="space-y-1 text-sm">
                            <div className="flex justify-between gap-4 text-ink-2">
                              <dt>Nombre</dt>
                              <dd className="text-right font-medium text-ink">{p.cliente.nombre}</dd>
                            </div>
                            <div className="flex justify-between gap-4 text-ink-2">
                              <dt>Email</dt>
                              <dd className="text-right font-medium text-ink">{p.cliente.email || '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-4 text-ink-2">
                              <dt>Teléfono</dt>
                              <dd className="text-right font-medium text-ink">{p.cliente.telefono || '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-4 text-ink-2">
                              <dt>Cédula</dt>
                              <dd className="text-right font-medium text-ink">{p.cliente.documento || '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-4 text-ink-2">
                              <dt>Dirección</dt>
                              <dd className="text-right font-medium text-ink">
                                {p.cliente.direccion || '—'}
                                {p.cliente.ciudad && p.cliente.direccion ? `, ${p.cliente.ciudad}` : ''}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="rounded-xl border border-line bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
                            Pago
                          </p>
                          <dl className="space-y-1 text-sm">
                            <div className="flex justify-between gap-4 text-ink-2">
                              <dt>Total</dt>
                              <dd className="text-right font-bold text-ink">{formato(p.total)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 text-ink-2">
                              <dt>Estado</dt>
                              <dd className="text-right font-medium text-ink">
                                {p.payment_status === 'APPROVED' ? 'Aprobado (Wompi)' : p.estado}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-4 text-ink-2">
                              <dt>Método</dt>
                              <dd className="text-right font-medium text-ink">{p.metodo_pago || '—'}</dd>
                            </div>
                            {p.franquicia && (
                              <div className="flex justify-between gap-4 text-ink-2">
                                <dt>Franquicia</dt>
                                <dd className="text-right font-medium text-ink">{p.franquicia}</dd>
                              </div>
                            )}
                            {p.wompi_transaction_id && (
                              <div className="flex justify-between gap-4 text-ink-2">
                                <dt>Ref. Wompi</dt>
                                <dd className="max-w-40 truncate text-right font-medium text-ink">
                                  {p.wompi_transaction_id}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}