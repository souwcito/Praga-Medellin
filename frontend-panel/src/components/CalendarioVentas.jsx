import { useMemo, useRef, useState } from 'react'
import { CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from './icons'

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const compacto = (n) => {
  const valor = Number(n) || 0
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1)}M`
  if (valor >= 1_000) return `$${Math.round(valor / 1_000)}k`
  return valor > 0 ? `$${valor}` : ''
}

const pad = (n) => String(n).padStart(2, '0')

const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Calendario mensual de ventas. Cada día muestra ingresos y número de ventas;
// al hacer clic se selecciona para filtrar el historial y ver el resumen del día.
export default function CalendarioVentas({
  mes,
  fecha,
  dias = [],
  resumenMes,
  cargando = false,
  onMesChange,
  onSeleccionar,
  onHoy,
  onMes,
}) {
  const gridRef = useRef(null)
  const hoy = hoyISO()
  const [colapsado, setColapsado] = useState(false)

  const porFecha = useMemo(
    () => Object.fromEntries((dias || []).map((d) => [d.fecha, d])),
    [dias],
  )

  const [anio, numeroMes] = useMemo(
    () => mes.split('-').map(Number),
    [mes],
  )

  const primerDia = new Date(anio, numeroMes - 1, 1)
  const offset = (primerDia.getDay() + 6) % 7
  const totalDias = new Date(anio, numeroMes, 0).getDate()
  const maxTotal = Math.max(1, ...dias.map((d) => Number(d.total) || 0))

  const tituloMes = new Date(anio, numeroMes - 1, 1)
    .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())

  const cambiarMes = (delta) => {
    const d = new Date(anio, numeroMes - 1 + delta, 1)
    onMesChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
  }

  function moverFoco(e, fechaDia) {
    const teclas = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
    if (!teclas.includes(e.key)) return
    e.preventDefault()

    const [y, m, d] = fechaDia.split('-').map(Number)
    const delta =
      e.key === 'ArrowLeft' ? -1
        : e.key === 'ArrowRight' ? 1
          : e.key === 'ArrowUp' ? -7
            : e.key === 'ArrowDown' ? 7
              : 0

    let destino
    if (e.key === 'Home') destino = new Date(y, m - 1, 1)
    else if (e.key === 'End') destino = new Date(y, m, 0)
    else destino = new Date(y, m - 1, d + delta)

    const iso = `${destino.getFullYear()}-${pad(destino.getMonth() + 1)}-${pad(destino.getDate())}`
    const boton = gridRef.current?.querySelector(`[data-fecha="${iso}"]`)
    if (boton) boton.focus()
  }

  const celdas = []
  for (let i = 0; i < offset; i++) celdas.push(null)
  for (let dia = 1; dia <= totalDias; dia++) {
    const iso = `${anio}-${pad(numeroMes)}-${pad(dia)}`
    celdas.push({ dia, iso })
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white shadow-sm">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-2">
              Calendario de ventas
            </p>
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
              {tituloMes}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setColapsado((v) => !v)}
            aria-expanded={!colapsado}
            aria-controls="calendario-ventas-cuerpo"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink sm:hidden"
          >
            {colapsado ? 'Ver calendario' : 'Ocultar'}
            <ChevronDownIcon
              className={`h-3.5 w-3.5 transition-transform ${colapsado ? '-rotate-90' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={onHoy}
            className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={onMes}
            className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink"
          >
            Mes
          </button>
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface-2 p-0.5">
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-white hover:text-ink active:scale-90"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-white hover:text-ink active:scale-90"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        id="calendario-ventas-cuerpo"
        className={colapsado ? 'hidden sm:block' : ''}
      >
      <div className="grid gap-3 border-b border-line bg-surface-2/40 px-5 py-3 text-xs sm:grid-cols-3">
        <div className="flex items-baseline justify-between gap-2 sm:block">
          <span className="text-ink-2">Ingresos del mes</span>
          <p className="text-base font-bold text-ink">
            {formato(resumenMes?.total || 0)}
          </p>
        </div>
        <div className="flex items-baseline justify-between gap-2 sm:block">
          <span className="text-ink-2">Ventas del mes</span>
          <p className="text-base font-bold text-ink">
            {resumenMes?.ventas || 0}
          </p>
        </div>
        <div className="flex items-baseline justify-between gap-2 sm:block">
          <span className="text-ink-2">Ticket promedio</span>
          <p className="text-base font-bold text-ink">
            {formato(resumenMes?.ticket_promedio || 0)}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-7 gap-1.5">
          {DIAS.map((dia, idx) => (
            <div
              key={`${dia}-${idx}`}
              className="pb-1 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-ink-2/60"
            >
              {dia}
            </div>
          ))}

          {celdas.map((celda, idx) => {
            if (!celda) {
              return <div key={`vacio-${idx}`} className="min-h-[4.4rem]" />
            }

            const info = porFecha[celda.iso]
            const seleccionado = celda.iso === fecha
            const esHoy = celda.iso === hoy
            const ratio = info?.total ? Number(info.total) / maxTotal : 0
            const fondo = !seleccionado && info?.total
              ? { backgroundColor: `rgba(16,16,16,${0.035 + ratio * 0.11})` }
              : undefined

            return (
              <button
                key={celda.iso}
                type="button"
                data-fecha={celda.iso}
                onClick={() => onSeleccionar(celda.iso)}
                onKeyDown={(e) => moverFoco(e, celda.iso)}
                aria-pressed={seleccionado}
                aria-label={`${celda.iso}${info?.ventas ? `, ${info.ventas} ventas, ${formato(info.total)}` : ', sin ventas'}`}
                style={fondo}
                title={
                  info?.ventas
                    ? `${celda.iso} · ${info.ventas} ventas · ${formato(info.total)}`
                    : `${celda.iso} · sin ventas`
                }
                className={`group relative flex min-h-[4.4rem] flex-col justify-between rounded-2xl border p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-metal/60 ${
                  seleccionado
                    ? 'border-ink bg-ink text-white shadow-lg shadow-ink/20'
                    : 'border-line/80 bg-white/70'
                } ${esHoy && !seleccionado ? 'ring-1 ring-ink/30' : ''} ${cargando ? 'animate-pulse opacity-60' : ''}`}
              >
                <span className={`flex w-full items-center justify-between text-xs font-semibold ${seleccionado ? 'text-white' : 'text-ink'}`}>
                  {celda.dia}
                  {esHoy && (
                    <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-metal' : 'bg-ink'}`} />
                  )}
                </span>

                <span className="block min-w-0">
                  {info?.total ? (
                    <>
                      <span className={`block truncate text-[10px] font-bold ${seleccionado ? 'text-white' : 'text-ink'}`}>
                        {compacto(info.total)}
                      </span>
                      <span className={`block text-[9px] ${seleccionado ? 'text-white/65' : 'text-ink-2/70'}`}>
                        {info.ventas} {info.ventas === 1 ? 'venta' : 'ventas'}
                      </span>
                    </>
                  ) : (
                    <span className={`block h-1 w-1 rounded-full ${seleccionado ? 'bg-white/50' : 'bg-ink-2/15'}`} />
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-2/60">
          <span>El color del día indica el nivel de ingresos.</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
            Día con ventas
          </span>
        </div>
      </div>
      </div>
    </section>
  )
}
