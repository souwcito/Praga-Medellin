import { useEffect, useState } from 'react'
import { catalogApi, comisionesApi } from '../services/api'
import PeriodFilter from '../components/PeriodFilter'
import { AlertIcon, ChevronDownIcon, StoreIcon } from '../components/icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const selectCls =
  'select-field w-full rounded-lg border border-line bg-white px-3 py-2 pr-9 text-sm text-ink transition-colors focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const fechaCorta = (iso) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const inicialesDe = (nombre) =>
  (nombre || '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

export default function Comisiones() {
  const [periodo, setPeriodo] = useState('mes')
  const [sedeId, setSedeId] = useState('')
  const [sedes, setSedes] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    catalogApi
      .getSedes()
      .then(setSedes)
      .catch((err) => setError(err?.message || 'Error cargando sedes'))
  }, [])

  useEffect(() => {
    comisionesApi
      .getResumen({ periodo, sede_id: sedeId || undefined })
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando el informe'))
      .finally(() => setLoading(false))
  }, [periodo, sedeId])

  function cambiarPeriodo(p) {
    if (p === periodo) return
    setPeriodo(p)
    setLoading(true)
  }

  function cambiarSede(e) {
    setSedeId(e.target.value)
    setLoading(true)
  }

  const totalPeriodo = data ? data.reduce((sum, e) => sum + e.total, 0) : 0
  const mejor = data?.[0] || null
  const sedeNombre = (id) => sedes.find((s) => s.id === id)?.nombre || '—'

  if (loading) {
    return (
      <div className="animate-fade-up mx-auto max-w-6xl">
        <div className="mb-6 h-8 w-72 animate-pulse rounded-lg bg-surface-2" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface-2" />
          ))}
        </div>
        <div className="mt-4 h-80 animate-pulse rounded-2xl border border-line bg-surface-2" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="animate-fade-in flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Comisiones
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Total vendido por cada vendedor en el periodo — solo informativo, sin cálculo de comisión.
          </p>
        </div>
        <PeriodFilter value={periodo} onChange={cambiarPeriodo} />
      </div>

      {/* Resumen */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="animate-fade-up rounded-2xl border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
            Total vendido del periodo
          </p>
          <p className="mt-2 text-2xl font-bold text-ink">{formato(totalPeriodo)}</p>
        </section>

        <section className="animate-fade-up rounded-2xl border border-line bg-white p-5 [animation-delay:80ms]">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
            Mejor vendedor del periodo
          </p>
          {mejor ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                {inicialesDe(mejor.nombre)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{mejor.nombre}</p>
                <p className="truncate text-xs text-ink-2">
                  {formato(mejor.total)} · {mejor.numVentas} ventas
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-2">Sin ventas en el periodo.</p>
          )}
        </section>
      </div>

      {/* Filtro por sede del vendedor */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
          <StoreIcon className="h-4 w-4" />
          <span>Sede del vendedor</span>
        </label>
        <select value={sedeId} onChange={cambiarSede} className={`${selectCls} w-72`}>
          <option value="">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de vendedores */}
      {!data || data.length === 0 ? (
        <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
          Sin vendedores con ventas en el periodo y sede seleccionados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[1fr_5rem_9rem_2.5rem] items-center gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <span>Vendedor</span>
            <span className="text-center">Ventas</span>
            <span className="text-right">Total vendido</span>
            <span />
          </div>

          {data.map((emp) => {
            const abierto = expanded === emp.empleado_id
            return (
              <div key={emp.empleado_id} className={abierto ? 'bg-surface-2/40' : ''}>
                <button
                  type="button"
                  onClick={() => setExpanded(abierto ? null : emp.empleado_id)}
                  className="grid w-full grid-cols-[1fr_5rem_9rem_2.5rem] items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-surface-2/60"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-ink-2">
                      {inicialesDe(emp.nombre)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{emp.nombre}</span>
                      <span className="block truncate text-xs text-ink-2">{emp.sede}</span>
                    </span>
                  </span>
                  <span className="text-center text-sm text-ink">{emp.numVentas}</span>
                  <span className="text-right text-sm font-semibold text-ink">
                    {formato(emp.total)}
                  </span>
                  <span className="justify-self-end">
                    <ChevronDownIcon
                      className={`h-5 w-5 text-ink-2/70 transition-transform duration-200 ${
                        abierto ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                </button>

                {abierto && (
                  <div className="animate-fade-in border-t border-line px-5 py-4">
                    <div className="grid grid-cols-[7rem_1fr_6rem_8rem_6rem] items-center gap-4 text-xs font-semibold uppercase tracking-wide text-ink-2">
                      <span>Factura</span>
                      <span>Fecha</span>
                      <span>Sede de venta</span>
                      <span className="text-center">Tipo</span>
                      <span className="text-right">Total</span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {emp.ventas.map((v) => (
                        <li
                          key={v.venta_id}
                          className="grid grid-cols-[7rem_1fr_6rem_8rem_6rem] items-center gap-4 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white"
                        >
                          <span className="font-medium text-ink">{v.factura || '—'}</span>
                          <span className="text-ink">{fechaCorta(v.fecha)}</span>
                          <span className="truncate text-ink-2">{sedeNombre(v.sede_venta_id)}</span>
                          <span className="text-center capitalize text-ink-2">{v.tipo}</span>
                          <span className="text-right font-medium text-ink">{formato(v.total)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}