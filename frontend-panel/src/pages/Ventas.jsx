import { useEffect, useState } from 'react'
import { catalogApi, ventasApi } from '../services/api'
import PeriodFilter from '../components/PeriodFilter'
import { AlertIcon, StoreIcon, UserIcon } from '../components/icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const selectCls =
  'select-field w-full rounded-lg border border-line bg-white px-3 py-2 pr-9 text-sm text-ink transition-colors focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const fechaLarga = (iso) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
]

export default function Ventas() {
  const [sedes, setSedes] = useState([])
  const [empleados, setEmpleados] = useState([])

  const [periodo, setPeriodo] = useState('mes')
  const [sedeId, setSedeId] = useState('')
  const [empleadoId, setEmpleadoId] = useState('')
  const [tipo, setTipo] = useState('')
  const [page, setPage] = useState(1)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Carga las opciones de los filtros (sedes y vendedores)
  useEffect(() => {
    Promise.all([catalogApi.getSedes(), catalogApi.getEmpleados()])
      .then(([s, e]) => {
        setSedes(s)
        setEmpleados(e)
      })
      .catch((err) => setError(err?.message || 'Error cargando filtros'))
  }, [])

  useEffect(() => {
    ventasApi
      .getHistorial({
        periodo,
        sede_id: sedeId || undefined,
        empleado_id: empleadoId || undefined,
        tipo: tipo || undefined,
        page,
        per_page: 10,
      })
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando las ventas'))
      .finally(() => setLoading(false))
  }, [periodo, sedeId, empleadoId, tipo, page])

  function cambiarPeriodo(p) {
    if (p === periodo) return
    setPeriodo(p)
    setPage(1)
    setLoading(true)
  }

  function cambiarSede(e) {
    setSedeId(e.target.value)
    setPage(1)
    setLoading(true)
  }

  function cambiarEmpleado(e) {
    setEmpleadoId(e.target.value)
    setPage(1)
    setLoading(true)
  }

  function cambiarTipo(e) {
    setTipo(e.target.value)
    setPage(1)
    setLoading(true)
  }

  function irA(pagina) {
    setPage(pagina)
    setLoading(true)
  }

  if (loading) {
    return (
      <div className="animate-fade-up mx-auto max-w-6xl">
        <div className="mb-6 h-8 w-72 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-10 w-full animate-pulse rounded-xl border border-line bg-surface-2" />
        <div className="mt-4 h-96 animate-pulse rounded-2xl border border-line bg-surface-2" />
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

  const { data: filas, meta, resumen } = data

  return (
    <div className="animate-fade-up mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Historial de ventas
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            {meta.total} ventas · {formato(resumen.totalVendido)} en el periodo filtrado.
          </p>
        </div>
        <PeriodFilter value={periodo} onChange={cambiarPeriodo} />
      </div>

      {/* Filtros */}
      <div className="mb-4 grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <StoreIcon className="h-4 w-4" /> Sede de venta
          </span>
          <select value={sedeId} onChange={cambiarSede} className={selectCls}>
            <option value="">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <UserIcon className="h-4 w-4" /> Vendedor
          </span>
          <select value={empleadoId} onChange={cambiarEmpleado} className={selectCls}>
            <option value="">Todos los vendedores</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
            Tipo
          </span>
          <select value={tipo} onChange={cambiarTipo} className={selectCls}>
            {TIPOS.map((t) => (
              <option key={t.value || 'all'} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <div className="hidden items-end sm:flex">
          <span className="text-sm text-ink-2">
            Mostrando página {meta.current_page} de {meta.last_page}.
          </span>
        </div>
      </div>

      {/* Tabla */}
      {filas.length === 0 ? (
        <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
          Sin ventas para los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[6.5rem_1fr_9rem_1fr_5.5rem_7.5rem] items-center gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <span>Factura</span>
            <span>Fecha</span>
            <span>Vendedor</span>
            <span>Sede de venta</span>
            <span className="text-center">Tipo</span>
            <span className="text-right">Total</span>
          </div>

          <ul className="divide-y divide-line">
            {filas.map((v) => (
              <li
                key={v.id}
                className="grid grid-cols-[6.5rem_1fr_9rem_1fr_5.5rem_7.5rem] items-center gap-4 px-5 py-3 text-sm transition-colors hover:bg-surface-2/50"
              >
                <span className="font-medium text-ink">{v.factura || '—'}</span>
                <span className="text-ink">{fechaLarga(v.fecha)}</span>
                <span className="truncate text-ink">{v.empleado.nombre}</span>
                <span className="truncate text-ink-2">{v.sede_venta}</span>
                <span className="justify-self-center">
                  <span className="inline-flex rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium capitalize text-ink-2">
                    {v.tipo}
                  </span>
                </span>
                <span className="text-right font-semibold text-ink">{formato(v.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Paginación */}
      {meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-ink-2">
            Mostrando {filas.length} de {meta.total} ventas
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => irA(meta.current_page - 1)}
              disabled={meta.current_page <= 1}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-ink-2">
              Página {meta.current_page} de {meta.last_page}
            </span>
            <button
              type="button"
              onClick={() => irA(meta.current_page + 1)}
              disabled={meta.current_page >= meta.last_page}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}