import { calcularRecompensas } from '../utils/recompensas'
import { formato } from '../utils/formato'
import { CheckIcon, GiftIcon, PercentIcon, TruckIcon } from './icons'

// Barra/lista de recompensas del carrito: muestra las 3 metas y el progreso
// hacia la siguiente sin cumplir. `total` es el subtotal (contexto del carrito).

const ICONOS = {
  envio: TruckIcon,
  fragancia: GiftIcon,
  descuento: PercentIcon,
}

function ProximoObjetivo({ recompensas }) {
  const siguiente = recompensas.metas.find((m) => !m.alcanzada)
  if (!siguiente) {
    return (
      <p className="text-sm font-semibold text-emerald-700">
        ¡Tienes todas las recompensas activadas!
      </p>
    )
  }
  const falta = Math.max(0, siguiente.meta - recompensas.subtotal)
  const pct = Math.min(100, Math.round((recompensas.subtotal / siguiente.meta) * 100))
  return (
    <div>
      <p className="text-sm font-medium text-ink">
        Te faltan <span className="font-bold">{formato(falta)}</span> para{' '}
        <span className="font-semibold lowercase">{siguiente.titulo}</span>
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-ink transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function Recompensas({ items = [] }) {
  const recompensas = calcularRecompensas(items)

  return (
    <div className="rounded-2xl border border-line bg-surface-2/50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
        Tus recompensas
      </p>
      <ul className="space-y-2">
        {recompensas.metas.map((m) => {
          const Icono = ICONOS[m.id]
          return (
            <li key={m.id} className="flex items-center gap-2.5 text-sm">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  m.alcanzada ? 'bg-emerald-700 text-white' : 'bg-white text-ink-2'
                }`}
              >
                {m.alcanzada ? <CheckIcon className="h-4 w-4" /> : <Icono className="h-4 w-4" />}
              </span>
              <span
                className={`flex-1 font-medium ${m.alcanzada ? 'text-ink' : 'text-ink-2'}`}
              >
                {m.titulo}
              </span>
              <span className={`text-xs ${m.alcanzada ? 'text-emerald-700' : 'text-ink-2/70'}`}>
                {m.alcanzada ? 'Listo' : formato(m.meta)}
              </span>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 border-t border-line pt-3">
        <ProximoObjetivo recompensas={recompensas} />
      </div>
    </div>
  )
}

// Franja fina para el header: solo la siguiente meta y su barra.
export function RecompensasBarra({ items = [] }) {
  const recompensas = calcularRecompensas(items)
  const siguiente = recompensas.metas.find((m) => !m.alcanzada)

  if (!siguiente) {
    return (
      <div className="bg-emerald-700 px-4 py-1.5 text-center text-[11px] font-semibold text-white">
        ¡Tienes todas las recompensas activadas!
      </div>
    )
  }

  const falta = Math.max(0, siguiente.meta - recompensas.subtotal)
  const pct = Math.min(100, Math.round((recompensas.subtotal / siguiente.meta) * 100))

  return (
    <div className="bg-ink px-4 py-1.5">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <span className="shrink-0 text-[11px] font-medium text-white/80">
          Te faltan <span className="font-bold text-white">{formato(falta)}</span> para{' '}
          <span className="text-white/90 lowercase">{siguiente.titulo}</span>
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
