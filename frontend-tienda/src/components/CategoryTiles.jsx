import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalogApi } from '../services/api'
import { ArrowRightIcon } from './icons'

// Categorías destacadas de la portada. Usan nombres y enlaces REALES del
// catálogo; la portada es la imagen del primer producto real de cada categoría.
const DESTACADAS = [
  ['hombre', 'Camisetas'],
  ['hombre', 'Buzos'],
  ['hombre', 'Tenis'],
  ['hombre', 'Bolsos'],
  ['hombre', 'Gorras'],
  ['hombre', 'Perfumes'],
]

export default function CategoryTiles() {
  const [tiles, setTiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let activo = true
    catalogApi
      .getCategorias()
      .then(async (cats) => {
        const datos = []
        for (const [catalogo, nombre] of DESTACADAS) {
          const cat = cats.find((c) => c.catalogo === catalogo && c.nombre === nombre)
          if (!cat) continue
          let portada = null
          try {
            const lista = await catalogApi.getProductos({ catalogo, categoria_id: cat.id, limit: 1 })
            portada = lista[0]?.imagen_url || null
          } catch {}
          datos.push({ ...cat, catalogo, portada })
        }
        // Fallback: si ningún nombre coincidió, toma categorías reales de hombre.
        const listaFinal = datos.length
          ? datos
          : cats.filter((c) => c.catalogo === 'hombre').slice(0, 6)
        if (activo) setTiles(listaFinal)
      })
      .catch(() => {})
      .finally(() => {
        if (activo) setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [])

  return (
    <section className="container-page py-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="section-title">Categorías</h2>
          <p className="mt-1 text-sm text-ink-2">Explora por tipo de prenda.</p>
        </div>
        <Link
          to="/catalogo"
          className="group flex items-center gap-1.5 text-sm font-semibold text-ink-2 transition-colors hover:text-ink"
        >
          Ver catálogo completo
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {tiles.map((t) => (
            <Link
              key={t.id}
              to={`/catalogo/${t.catalogo}/${t.id}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-xl bg-surface-2"
            >
              {t.portada && (
                <img
                  src={t.portada}
                  alt={t.nombre}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-display text-lg font-semibold uppercase tracking-wide text-white">
                  {t.nombre}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-white/70 transition-colors group-hover:text-white">
                  Explorar <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}