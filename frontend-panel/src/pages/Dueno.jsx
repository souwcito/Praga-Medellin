import { useDuenoResumen } from '../hooks/useData'
import { AlertIcon, CoinsIcon, LayersIcon, PackageIcon, ReceiptIcon } from '../components/icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const nro = (n) => new Intl.NumberFormat('es-CO').format(n || 0)

export default function Dueno() {
  const { data, isLoading, isError, error: errorRaw } = useDuenoResumen()
  const error = errorRaw?.message || (isError ? 'Error cargando el resumen' : null)

  if (isLoading) {
    return (
      <div className="animate-fade-up mx-auto max-w-6xl">
        <div className="mb-6 h-8 w-64 animate-pulse rounded-lg bg-surface-2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface-2" />
          ))}
        </div>
        <div className="mt-4 h-72 animate-pulse rounded-2xl border border-line bg-surface-2" />
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

  const { sedes = [], total } = data

  const cards = [
    { label: 'Unidades en inventario', valor: nro(total.unidades), icon: PackageIcon },
    { label: 'Valor de mercancía (costo)', valor: formato(total.valor_costo), icon: LayersIcon },
    { label: 'Valor a precio de venta', valor: formato(total.valor_venta), icon: ReceiptIcon },
    { label: 'Margen potencial', valor: formato(total.margen), icon: CoinsIcon },
  ]

  return (
    <div className="animate-fade-up mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Panel del dueño</h1>
        <p className="mt-1 text-sm text-ink-2">
          Resumen de mercancía por sede: cuánto te cuesta (costo × stock) y cuánto vale a precio de venta.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
                <Icon className="h-4 w-4" />
                {c.label}
              </div>
              <p className="mt-3 text-2xl font-bold text-ink">{c.valor}</p>
            </div>
          )
        })}
      </div>

      {total.productos_sin_costo > 0 && (
        <div className="animate-fade-in mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {total.productos_sin_costo} producto(s) aún sin costo definido: su valor de mercancía se cuenta en 0.
          Pásalos a "Productos y costos" para llenarlos.
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
          Mercancía por sede
        </div>
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-[1fr_6rem_8rem_8rem_8rem_7rem] items-center gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <span>Sede</span>
            <span className="text-right">Unidades</span>
            <span className="text-right">Valor costo</span>
            <span className="text-right">Valor venta</span>
            <span className="text-right">Margen</span>
            <span className="text-right">Sin costo</span>
          </div>
          <ul className="divide-y divide-line">
            {sedes.map((s) => (
              <li
                key={s.sede_id}
                className="grid min-w-[720px] grid-cols-[1fr_6rem_8rem_8rem_8rem_7rem] items-center gap-4 px-5 py-3 text-sm"
              >
                <span className="font-medium text-ink">{s.sede}</span>
                <span className="text-right text-ink">{nro(s.unidades)}</span>
                <span className="text-right font-semibold text-ink">{formato(s.valor_costo)}</span>
                <span className="text-right text-ink">{formato(s.valor_venta)}</span>
                <span className={`text-right font-semibold ${s.margen >= 0 ? 'text-ink' : 'text-red-700'}`}>
                  {formato(s.margen)}
                </span>
                <span className="text-right text-ink-2">
                  {s.unidades_sin_costo > 0 ? nro(s.unidades_sin_costo) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}