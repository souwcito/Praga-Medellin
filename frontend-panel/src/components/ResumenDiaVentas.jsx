import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CoinsIcon, ReceiptIcon, StoreIcon, TagIcon, UserIcon } from './icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const METODO_LABEL = {
  efectivo: 'Efectivo',
  banco: 'Banco',
  transferencia: 'Transferencia',
  addi: 'Addi',
  sistecredito: 'Sistecredito',
  bold: 'Bold',
  wompi: 'Wompi',
  nequi: 'Nequi',
}

const TIPO_LABEL = {
  presencial: 'Punto físico',
  virtual: 'Redes',
  plan_separe: 'Plan Separe',
}

function Kpi({ label, value, hint, accent = 'ink' }) {
  const acento =
    accent === 'emerald'
      ? 'text-emerald-700'
      : accent === 'amber'
        ? 'text-amber-700'
        : accent === 'red'
          ? 'text-red-700'
          : 'text-ink'

  return (
    <div className="rounded-2xl border border-line bg-white p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2/70">
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold tracking-tight ${acento}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-2/60">{hint}</p>}
    </div>
  )
}

function ListaVacia({ children }) {
  return (
    <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-ink-2/60">
      {children}
    </p>
  )
}

// Resumen visual del día seleccionado (o del mes cuando no hay día).
export default function ResumenDiaVentas({ resumen, esMes = false, cargando = false }) {
  if (cargando || !resumen) {
    return (
      <div className="animate-pulse rounded-3xl border border-line bg-white p-5">
        <div className="mb-4 h-6 w-48 rounded bg-surface-2" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-surface-2" />
          ))}
        </div>
        <div className="mt-4 h-48 rounded-2xl bg-surface-2" />
      </div>
    )
  }

  const ventas = Number(resumen.ventas) || 0
  const total = Number(resumen.total) || 0
  const unidades = Number(resumen.unidades) || 0
  const descuento = Number(resumen.descuento) || 0
  const devoluciones = resumen.devoluciones || {}
  const reembolsado = Number(devoluciones.reembolsado) || 0
  const neto = Number(resumen.neto ?? total - reembolsado)
  const datosHora = (resumen.por_hora || []).map((h) => ({
    ...h,
    etiqueta: `${h.hora}:00`,
  }))
  const hayVentasPorHora = datosHora.some((h) => Number(h.total) > 0)

  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-2">
            {esMes ? 'Resumen del mes' : 'Resumen del día'}
          </p>
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
            {esMes ? 'Cómo va el mes' : 'Cómo se movió el día'}
          </h2>
        </div>
        <p className="text-xs text-ink-2/70">
          {ventas} {ventas === 1 ? 'venta' : 'ventas'} · {unidades}{' '}
          {unidades === 1 ? 'unidad' : 'unidades'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Ingresos brutos" value={formato(total)} hint="Ventas registradas" />
        <Kpi label="Ventas" value={ventas} hint="Transacciones" />
        <Kpi label="Ticket promedio" value={formato(resumen.ticket_promedio || 0)} hint="Por venta" />
        <Kpi label="Unidades" value={unidades} hint="Prendas / artículos" />
        <Kpi
          label="Descuentos"
          value={formato(descuento)}
          hint={esMes ? 'Aplicados en el mes' : 'Aplicados en el día'}
          accent="amber"
        />
        <Kpi
          label="Reembolsos"
          value={formato(reembolsado)}
          hint={`${devoluciones.cantidad || 0} ${
            Number(devoluciones.cantidad) === 1 ? 'devolución' : 'devoluciones'
          }`}
          accent="red"
        />
        <Kpi
          label="Ingresos netos"
          value={formato(neto)}
          hint="Ventas − reembolsos"
          accent={neto < 0 ? 'red' : 'emerald'}
        />
        <Kpi
          label="Tipos de venta"
          value={(resumen.por_tipo || []).length || 0}
          hint={(resumen.por_tipo || [])
            .map((t) => TIPO_LABEL[t.tipo] || t.tipo)
            .join(' · ') || 'Sin ventas'}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-line bg-surface-2/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-2">
                Ingresos por hora
              </p>
              <p className="text-[11px] text-ink-2/60">Hora local de Colombia</p>
            </div>
            <CoinsIcon className="h-4 w-4 text-ink-2/50" />
          </div>

          {hayVentasPorHora ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={datosHora} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis
                  dataKey="hora"
                  tickFormatter={(h) => `${h}h`}
                  tick={{ fontSize: 10, fill: '#78716c' }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#78716c' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                  width={38}
                />
                <Tooltip
                  formatter={(value) => [formato(value), 'Ingresos']}
                  labelFormatter={(h) => `${h}:00`}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e7e5e4',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" fill="#101010" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ListaVacia>Sin ventas para graficar en este periodo.</ListaVacia>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2">
                <StoreIcon className="h-3.5 w-3.5" /> Por sede
              </p>
              <div className="space-y-1.5">
                {(resumen.por_sede || []).length === 0 ? (
                  <ListaVacia>Sin ventas.</ListaVacia>
                ) : (
                  resumen.por_sede.map((s) => (
                    <div key={s.sede_id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-ink-2">{s.sede}</span>
                      <span className="shrink-0 font-semibold text-ink">{formato(s.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2">
                <TagIcon className="h-3.5 w-3.5" /> Métodos de pago
              </p>
              <div className="space-y-1.5">
                {(resumen.por_metodo || []).length === 0 ? (
                  <ListaVacia>Sin pagos.</ListaVacia>
                ) : (
                  resumen.por_metodo.map((m) => (
                    <div key={m.metodo_pago} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-ink-2">
                        {METODO_LABEL[m.metodo_pago] || m.metodo_pago}
                      </span>
                      <span className="font-semibold text-ink">{formato(m.monto)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-white p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2">
              <ReceiptIcon className="h-3.5 w-3.5" /> Top productos
            </p>
            {(resumen.top_productos || []).length === 0 ? (
              <ListaVacia>Sin productos vendidos.</ListaVacia>
            ) : (
              <ul className="space-y-1.5">
                {resumen.top_productos.map((p, i) => (
                  <li key={`${p.nombre}-${i}`} className="flex items-center gap-2 text-xs">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[10px] font-bold text-ink-2">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{p.nombre}</span>
                    <span className="shrink-0 text-ink-2">{p.cantidad} u.</span>
                    <span className="w-20 shrink-0 text-right font-semibold text-ink">
                      {formato(p.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-white p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2">
              <UserIcon className="h-3.5 w-3.5" /> Top vendedores
            </p>
            {(resumen.top_vendedores || []).length === 0 ? (
              <ListaVacia>Sin ventas.</ListaVacia>
            ) : (
              <ul className="space-y-1.5">
                {resumen.top_vendedores.map((v, i) => (
                  <li key={`${v.empleado_id}-${i}`} className="flex items-center gap-2 text-xs">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[10px] font-bold text-ink-2">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{v.nombre}</span>
                    <span className="shrink-0 text-ink-2">{v.ventas} v.</span>
                    <span className="w-20 shrink-0 text-right font-semibold text-ink">
                      {formato(v.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
