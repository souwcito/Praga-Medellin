import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { dashboardApi } from '../services/api'
import { AlertIcon } from '../components/icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e0e0e0',
  borderRadius: 10,
  fontSize: 12,
  color: '#0a0a0a',
  boxShadow: '0 8px 24px -12px rgba(10,10,10,0.18)',
  padding: '8px 12px',
}

const PERIODOS = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
]

// Tarjeta base reutilizable (mismo estilo de marca en todo el dashboard)
function Card({ title, subtitle, delay = 0, children, className = '' }) {
  return (
    <section
      className={`animate-fade-up rounded-2xl border border-line bg-white p-5 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-2">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

export default function Dashboard() {
  const [periodo, setPeriodo] = useState('mes')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    dashboardApi
      .getResumen(periodo)
      .then(setData)
      .catch((err) => setError(err?.message || 'Error cargando el dashboard'))
      .finally(() => setLoading(false))
  }, [periodo])

  function cambiarPeriodo(p) {
    if (p === periodo) return
    setPeriodo(p)
    setLoading(true)
  }

  // Skeleton de carga (pulso suave, coherente con la paleta)
  if (loading) {
    return (
      <div className="animate-fade-up mx-auto max-w-7xl">
        <div className="mb-6 h-8 w-64 animate-pulse rounded-lg bg-surface-2" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-line bg-surface-2" />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl border border-line bg-surface-2" />
          <div className="h-80 animate-pulse rounded-2xl border border-line bg-surface-2" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="animate-fade-in flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </div>
    )
  }

  const { total, numVentas, ticketPromedio, totalPorSede, productosMasVendidos, empleadoDestacado, ventasPorDia } = data
  const iniciales = (empleadoDestacado?.nombre || '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <div className="animate-fade-up mx-auto max-w-7xl">
      {/* Encabezado + filtro de periodo */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-2">
            Resumen de ventas de las 4 sedes y métricas del periodo.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => cambiarPeriodo(p.value)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                periodo === p.value
                  ? 'bg-ink text-white shadow-sm'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card title="Total ventas" subtitle={periodo === 'dia' ? 'Hoy' : periodo === 'semana' ? 'Últimos 7 días' : 'Últimos 30 días'} delay={0}>
          <p className="text-2xl font-bold text-ink">{formato(total)}</p>
        </Card>

        <Card title="Nº de ventas" subtitle="Transacciones" delay={60}>
          <p className="text-2xl font-bold text-ink">{numVentas}</p>
        </Card>

        <Card title="Ticket promedio" subtitle="Por venta" delay={120}>
          <p className="text-2xl font-bold text-ink">{formato(ticketPromedio)}</p>
        </Card>

        <Card title="Empleado destacado" subtitle="Mayor venta del periodo" delay={180}>
          {empleadoDestacado ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                {iniciales}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {empleadoDestacado.nombre}
                </p>
                <p className="truncate text-xs text-ink-2">{empleadoDestacado.sede}</p>
                <p className="text-xs font-medium text-ink-2">
                  {formato(empleadoDestacado.total)} · {empleadoDestacado.numVentas} ventas
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-2">Sin ventas en el periodo.</p>
          )}
        </Card>
      </div>

      {/* Gráficas */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Productos más vendidos"
          subtitle="Por unidades en el periodo"
          delay={80}
          className="min-h-[20rem]"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={productosMasVendidos}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="producto"
                width={160}
                tick={{ fontSize: 11, fill: '#4a4a4a' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'rgba(10,10,10,0.04)' }}
                formatter={(value) => [`${value} unidades`, 'Vendidas']}
              />
              <Bar dataKey="cantidad" fill="#0a0a0a" radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Ventas por día"
          subtitle="Tendencia del periodo"
          delay={140}
          className="min-h-[20rem]"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={ventasPorDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8c8c8c" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8c8c8c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 10, fill: '#4a4a4a' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#4a4a4a' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                width={42}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formato(value), 'Total']} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#0a0a0a"
                strokeWidth={2}
                fill="url(#gradTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Desglose por sede */}
      <Card
        title="Ventas por sede"
        subtitle="Participación de las 4 sedes en el periodo"
        delay={200}
        className="mt-4"
      >
        <div className="space-y-5">
          {totalPorSede.map((s) => {
            const pct = total > 0 ? Math.round((s.total / total) * 100) : 0
            return (
              <div key={s.sede_id}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium text-ink">{s.sede}</span>
                  <span className="text-xs text-ink-2">
                    {formato(s.total)} · {pct}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-ink transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}