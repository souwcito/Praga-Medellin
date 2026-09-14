import { Link } from 'react-router-dom'
import { formato } from '../utils/formato'

// Tarjeta de producto del catálogo/portada. Responsive por grid del contenedor.
export default function ProductCard({ producto }) {
  const disponibles = producto.variantes.filter((v) => v.stock > 0)
  const tallas = disponibles.map((v) => v.talla).filter(Boolean)
  const tieneTallas = tallas.length > 0

  return (
    <Link
      to={`/producto/${producto.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:border-metal hover:shadow-[0_16px_40px_-16px_rgba(10,10,10,0.25)]"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        <img
          src={producto.imagen_url}
          alt={producto.nombre}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {producto.destacado && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Destacado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-2">
          {producto.categoria || 'Praga'}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-medium text-ink">{producto.nombre}</h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <span className="text-lg font-bold text-ink">{formato(producto.precio)}</span>
          {tieneTallas ? (
            <span className="truncate text-xs text-ink-2">
              {tallas.slice(0, 3).join(' · ')}
              {tallas.length > 3 ? ' …' : ''}
            </span>
          ) : (
            <span className="text-xs text-ink-2">Talla única</span>
          )}
        </div>
      </div>
    </Link>
  )
}