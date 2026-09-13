export default function Dashboard() {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-2">
        Resumen de ventas, productos más vendidos y empleados destacados.
      </p>
      <div className="mt-6 grid h-64 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
        Próximamente: gráficas y métricas por sede y periodo.
      </div>
    </div>
  )
}