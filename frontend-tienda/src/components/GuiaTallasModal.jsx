import { useEffect } from 'react'
import { GUIA_TALLAS_TENIS } from '../data/guiaTallas'
import { XIcon } from './icons'

const COLUMNAS = [
  { clave: 'co', titulo: 'CO' },
  { clave: 'us', titulo: 'USA' },
  { clave: 'eur', titulo: 'EUR' },
  { clave: 'cm', titulo: 'CM' },
]

export default function GuiaTallasModal({ abierta, onClose, genero = 'hombre' }) {
  useEffect(() => {
    if (!abierta) return undefined

    const anterior = document.body.style.overflow
    const alPresionar = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', alPresionar)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', alPresionar)
    }
  }, [abierta, onClose])

  if (!abierta) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guia-tallas-title"
    >
      <div
        className="animate-fade-in absolute inset-0 bg-dark/60"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="animate-scale-in relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2
              id="guia-tallas-title"
              className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl"
            >
              Guía de tallas
            </h2>
            <p className="mt-0.5 text-xs text-ink-2">
              Tenis y chanclas · equivalencias de referencia
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía de tallas"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-ink-2">
            En la tienda las tallas de tenis y chanclas se muestran en <b>USA (US)</b>.
            Usa esta tabla para comparar con Colombia (CO), Europa (EUR) y centímetros
            (CM).
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {GUIA_TALLAS_TENIS.map((seccion) => {
              const recomendada = genero === seccion.id
              return (
                <section
                  key={seccion.id}
                  className={`overflow-hidden rounded-2xl border ${
                    recomendada ? 'border-ink/25 bg-surface-2/30' : 'border-line bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                    <h3 className="font-display text-base font-semibold text-ink">
                      {seccion.titulo}
                    </h3>
                    {recomendada && (
                      <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Tu catálogo
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[260px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-surface-2/70 text-[10px] uppercase tracking-wide text-ink-2">
                          {COLUMNAS.map((columna) => (
                            <th
                              key={columna.clave}
                              scope="col"
                              className="px-3 py-2 text-center font-semibold"
                            >
                              {columna.titulo}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {seccion.filas.map((fila, indice) => (
                          <tr
                            key={`${seccion.id}-${indice}`}
                            className="border-t border-line/70"
                          >
                            {COLUMNAS.map((columna) => (
                              <td
                                key={columna.clave}
                                className="px-3 py-2 text-center text-ink-2"
                              >
                                {fila[columna.clave]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )
            })}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-ink-2/70">
            Las medidas en centímetros son de referencia y pueden variar ligeramente
            según el modelo. Si estás entre dos tallas, elige la mayor.
          </p>
        </div>
      </div>
    </div>
  )
}
