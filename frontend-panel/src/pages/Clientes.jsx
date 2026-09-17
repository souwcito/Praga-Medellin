import { useEffect, useState } from 'react'
import { clientesApi } from '../services/api'
import { AlertIcon, UserIcon } from '../components/icons'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    clientesApi
      .getClientes()
      .then((c) => {
        setClientes(c || [])
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando clientes'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="animate-fade-up mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Clientes</h1>
        <p className="mt-1 text-sm text-ink-2">
          Los datos de las personas que compran en el sitio web, para enviarles información.
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
      ) : clientes.length === 0 ? (
        <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-line">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
              <UserIcon className="h-8 w-8 text-ink-2/40" />
            </div>
            <p className="font-medium text-ink">Aún no hay clientes registrados</p>
            <p className="mt-1 text-sm text-ink-2">
              Los datos de los compradores del sitio web aparecerán aquí.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[1fr_1fr_8rem_1fr_6rem] items-center gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <span>Nombre</span>
            <span>Email</span>
            <span>Teléfono</span>
            <span>Dirección / Ciudad</span>
            <span>Registro</span>
          </div>
          <ul className="divide-y divide-line">
            {clientes.map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-[1fr_1fr_8rem_1fr_6rem] items-center gap-4 px-5 py-3 text-sm transition-colors hover:bg-surface-2/40"
              >
                <span className="truncate font-medium text-ink">{c.nombre}</span>
                <span className="truncate text-ink-2">{c.email || '—'}</span>
                <span className="truncate text-ink-2">{c.telefono || '—'}</span>
                <span className="truncate text-ink-2">
                  {c.direccion || '—'}
                  {c.ciudad ? ` · ${c.ciudad}` : ''}
                </span>
                <span className="text-ink-2">
                  {new Date(c.created_at).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}