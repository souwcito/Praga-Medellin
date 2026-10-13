import { Link } from 'react-router-dom'
import { ArrowRightIcon } from './icons'

// Encabezado de sección editorial: título + subtítulo + enlace opcional.
export default function SectionHeading({ titulo, sufijo, enlace, etiquetaEnlace = 'Ver todo' }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="section-title">{titulo}</h2>
        {sufijo && <p className="mt-1 text-sm text-ink-2">{sufijo}</p>}
      </div>
      {enlace && (
        <Link
          to={enlace}
          className="group flex items-center gap-1.5 text-sm font-semibold text-ink-2 transition-colors hover:text-ink"
        >
          {etiquetaEnlace}
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  )
}