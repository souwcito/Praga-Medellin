// Selector de periodo (Día / Semana / Mes) reutilizado en Dashboard, Comisiones y Ventas.
const PERIODOS = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
]

export default function PeriodFilter({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {PERIODOS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            value === p.value ? 'bg-ink text-white shadow-sm' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}