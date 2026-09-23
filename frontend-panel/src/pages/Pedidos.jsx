import { useEffect, useState } from 'react'
import { pedidosApi } from '../services/api'
import { AlertIcon, CartIcon } from '../components/icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const ESTADOS = {
  nuevo: 'Nuevo',
  pagado: 'Pagado',
  enviado: 'Enviado',
  entregado: 'Entregado',
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    pedidosApi
      .getPedidos()
      .then((res) => {
        setPedidos(res.data || [])
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando pedidos'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="animate-fade-up mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Pedidos online
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          Los pedidos que se hagan en el sitio web llegarán aquí.
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
              Cuando un cliente compre en el sitio web, su pedido aparecerá aquí.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[7rem_1fr_9rem_7rem_5rem] items-center gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <span>Pedido</span>
            <span>Cliente</span>
            <span>Fecha</span>
            <span className="text-right">Total</span>
            <span className="text-center">Estado</span>
          </div>
          <ul className="divide-y divide-line">
            {pedidos.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[7rem_1fr_9rem_7rem_5rem] items-center gap-4 px-5 py-3 text-sm transition-colors hover:bg-surface-2/40"
              >
                <span className="font-semibold text-ink">{p.numero}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{p.cliente}</span>
                  {p.cliente_email && (
                    <span className="block truncate text-xs text-ink-2">{p.cliente_email}</span>
                  )}
                </span>
                <span className="text-ink-2">
                  {new Date(p.fecha).toLocaleString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-right font-semibold text-ink">{formato(p.total)}</span>
                <span className="justify-self-center">
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium capitalize text-ink-2">
                    {ESTADOS[p.estado] || p.estado}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}