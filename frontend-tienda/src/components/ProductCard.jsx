import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formato } from '../utils/formato'
import { esChanclas, etiquetaTalla, ordenarPorTalla, ordenarTallas } from '../utils/tallas'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import { CartIcon, CheckIcon, HeartIcon, MinusIcon, PlusIcon, XIcon } from './icons'

// Tarjeta de producto del catálogo/portada. Única acción: "Agregar al carrito".
// Si el producto tiene tallas, abre un selector rápido; si es talla única, agrega al instante.
export default function ProductCard({ producto }) {
  const { agregar, abrirCarrito } = useCart()
  const { esFavorito, toggle } = useFavorites()

  const [modalAbierto, setModalAbierto] = useState(false)
  const [talla, setTalla] = useState(null)
  const [cantidad, setCantidad] = useState(1)

  const favorito = esFavorito(producto.id)

  // Variantes ordenadas con el criterio canónico de tallas.
  const variantes = ordenarPorTalla(producto.variantes)
  const disponibles = variantes.filter((v) => v.stock > 0)
  const agotado = disponibles.length === 0
  const conTalla = variantes.filter((v) => v.talla)
  const sinTalla = variantes.find((v) => !v.talla) || null
  const esTallaUnica = conTalla.length === 0
  const varianteUnica = esTallaUnica ? sinTalla : null

  // En chanclas, una variante puede tener varios rangos ("6-7/8-9"). Se
  // muestran como tallas separadas, apuntando a la misma variante.
  const opcionesTalla = useMemo(() => {
    const mapa = new Map()
    variantes.forEach((v) => {
      const etiqueta = etiquetaTalla(v.talla, producto) || 'Unitalla'
      const partes =
        esChanclas(producto) && etiqueta.includes('/')
          ? etiqueta.split('/').map((p) => p.trim())
          : [etiqueta]
      partes.forEach((label) => {
        if (!label) return
        const actual = mapa.get(label)
        if (!actual || (actual.variante.stock <= 0 && v.stock > 0)) {
          mapa.set(label, { label, variante: v })
        }
      })
    })
    return ordenarTallas([...mapa.keys()]).map((label) => mapa.get(label))
  }, [producto, variantes])

  const opcionesDisponibles = opcionesTalla.filter((o) => o.variante.stock > 0)

  function abrir() {
    if (esTallaUnica) {
      // Talla única: acción inmediata, sin modal
      agregar(producto, varianteUnica, 1)
      abrirCarrito()
      return
    }
    setTalla(null)
    setCantidad(1)
    setModalAbierto(true)
  }

  // Abre el selector rápido con la talla tocada ya marcada.
  function abrirConTalla(t) {
    if (!t) return
    setTalla(t)
    setCantidad(1)
    setModalAbierto(true)
  }

  function confirmar() {
    const variante = disponibles.find((v) => v.talla === talla)
    if (!variante) return
    agregar(producto, variante, cantidad)
    setModalAbierto(false)
    abrirCarrito()
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:border-metal hover:shadow-[0_16px_40px_-16px_rgba(10,10,10,0.25)]">
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        <Link to={`/producto/${producto.id}`} className="absolute inset-0">
          <div className="relative h-full w-full">
            <img
              src={producto.imagen_thumb || producto.imagen_url}
              srcSet={
                producto.imagen_thumb && producto.imagen_medium
                  ? `${producto.imagen_thumb} 400w, ${producto.imagen_medium} 800w, ${producto.imagen_url} 1200w`
                  : undefined
              }
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              alt={producto.nombre}
              width={600}
              height={600}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:opacity-0 group-hover:scale-105"
            />
            {(producto.imagenes?.[1] || producto.imagen_medium) && (
              <img
                src={producto.imagenes?.[1] || producto.imagen_medium}
                alt={`${producto.nombre} — vista alternativa`}
                width={600}
                height={600}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100 group-hover:scale-105"
              />
            )}
          </div>
        </Link>
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
          {producto.es_oferta && (
            <span className="rounded-full bg-red-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              -{producto.descuento}%
            </span>
          )}
          {producto.destacado && (
            <span className="rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              Destacado
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => toggle(producto)}
          aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${
            favorito
              ? 'bg-ink text-white'
              : 'bg-white/85 text-ink backdrop-blur hover:text-red-700'
          }`}
        >
          <HeartIcon filled={favorito} className="h-4 w-4" />
        </button>
        {agotado && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-[1px]">
            <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-2">
          {producto.categoria || 'Praga'}
        </p>
        <Link
          to={`/producto/${producto.id}`}
          className="mt-1 line-clamp-2 text-sm font-medium text-ink transition-colors hover:text-metal-2"
        >
          {producto.nombre}
        </Link>

        <div className="mt-2">
          {producto.es_oferta && (
            <span className="mr-1.5 text-xs text-ink-2 line-through">
              {formato(producto.precio_antes)}
            </span>
          )}
          <span className="text-lg font-bold text-ink">{formato(producto.precio)}</span>
        </div>

        {/* Cuadros de talla: todas las tallas; las agotadas se ven atenuadas. */}
        {(conTalla.length > 0 || sinTalla) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {conTalla.length > 0 ? (
              opcionesTalla.map(({ label, variante: v }) => {
                const agotada = v.stock <= 0
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={agotada}
                    onClick={() => abrirConTalla(v.talla)}
                    title={
                      agotada
                        ? `Talla ${label} agotada`
                        : `Elegir talla ${label}`
                    }
                    className={`min-w-7 rounded-md border px-2 py-1 text-[11px] font-semibold transition-all duration-200 ${
                      agotada
                        ? 'cursor-not-allowed border-line bg-surface-2 text-ink-2/40 line-through'
                        : 'border-line text-ink hover:border-ink hover:bg-ink hover:text-white active:scale-95'
                    }`}
                  >
                    {label}
                  </button>
                )
              })
            ) : (
              <span className="rounded-md border border-line bg-surface-2/60 px-2 py-1 text-[11px] font-semibold text-ink-2">
                Unitalla
              </span>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="mt-4 space-y-2">
          {agotado ? (
            <button
              type="button"
              disabled
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-surface-2 text-xs font-semibold text-ink-2/50"
            >
              Agotado
            </button>
          ) : (
            <button
              type="button"
              onClick={abrir}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-ink text-xs font-semibold text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98]"
            >
              <CartIcon className="h-4 w-4" />
              Agregar al carrito
            </button>
          )}
        </div>
      </div>

      {/* Selector rápido de talla */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="animate-fade-in absolute inset-0 bg-dark/70" onClick={() => setModalAbierto(false)} />
          <div className="animate-scale-in relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className="h-12 w-12 rounded-lg bg-surface-2 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{producto.nombre}</p>
                  <p className="text-xs font-semibold text-ink">{formato(producto.precio)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Cerrar"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-2 text-sm font-semibold text-ink">Elige tu talla</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {opcionesDisponibles.map(({ label, variante: v }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTalla(v.talla)}
                  className={`min-w-12 rounded-lg border px-3 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                    talla === v.talla
                      ? 'border-ink bg-ink text-white'
                      : 'border-line text-ink hover:border-ink-2/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mb-5 flex items-center gap-3">
              <span className="text-sm font-medium text-ink">Cantidad</span>
              <div className="flex items-center rounded-lg border border-line">
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  className="flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink active:scale-90"
                  aria-label="Disminuir"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="w-9 text-center text-sm font-semibold text-ink">{cantidad}</span>
                <button
                  type="button"
                  onClick={() => setCantidad((c) => c + 1)}
                  className="flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink active:scale-90"
                  aria-label="Aumentar"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={confirmar}
              disabled={talla === null}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckIcon className="h-5 w-5" />
              Agregar al carrito
            </button>
          </div>
        </div>
      )}
    </article>
  )
}