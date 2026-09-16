import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { catalogApi } from '../services/api'
import { useCart } from '../hooks/useCart'
import { formato } from '../utils/formato'
import Seo from '../components/Seo'
import { AlertIcon, CartIcon, CheckIcon, MinusIcon, PlusIcon } from '../components/icons'

// Wrapper: remonta el detalle cuando cambia el id (reinicia estado limpio).
export default function Producto() {
  const { id } = useParams()
  return <ProductoDetalle key={id} productoId={id} />
}

function ProductoDetalle({ productoId }) {
  const { agregar, abrirCarrito } = useCart()

  const [producto, setProducto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [talla, setTalla] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [agregado, setAgregado] = useState(false)

  useEffect(() => {
    catalogApi
      .getProducto(productoId)
      .then(setProducto)
      .catch((err) => setError(err?.message || 'No se pudo cargar el producto'))
      .finally(() => setLoading(false))
  }, [productoId])

  // Variante seleccionada. Si es talla única, se usa sola; si hay tallas, se
  // requiere elegir una (no se autoselecciona la primera).
  const variante = useMemo(() => {
    if (!producto) return null
    if (talla === null) {
      const primera = producto.variantes[0]
      return primera && primera.talla === null ? primera : null
    }
    return producto.variantes.find((v) => v.talla === talla) || null
  }, [producto, talla])

  const tieneTallas = producto?.variantes.some((v) => v.talla !== null) || false
  const stockVariante = variante ? variante.stock : 0

  function elegirTalla(t) {
    setTalla(t)
    setCantidad(1)
    setAgregado(false)
  }

  function agregarAlCarrito() {
    if (!producto || !variante) return
    agregar(producto, variante, cantidad)
    setAgregado(true)
    abrirCarrito()
  }

  if (loading) {
    return (
      <div className="mx-auto grid max-w-7xl animate-pulse gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="aspect-square rounded-2xl bg-surface-2" />
        <div className="space-y-4">
          <div className="h-4 w-24 rounded bg-surface-2" />
          <div className="h-10 w-3/4 rounded bg-surface-2" />
          <div className="h-8 w-40 rounded bg-surface-2" />
          <div className="h-24 w-full rounded bg-surface-2" />
        </div>
      </div>
    )
  }

  if (error || !producto) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error || 'Producto no encontrado'}
        </div>
        <Link
          to="/catalogo"
          className="mt-4 inline-block text-sm font-medium text-ink-2 underline underline-offset-2 hover:text-ink"
        >
          Volver al catálogo
        </Link>
      </div>
    )
  }

  return (
    <>
      <Seo title={producto.nombre} description={producto.descripcion} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Migas de pan */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-ink-2">
          <Link to="/" className="transition-colors hover:text-ink">Inicio</Link>
          <span>/</span>
          <Link to="/catalogo" className="transition-colors hover:text-ink">Catálogo</Link>
          <span>/</span>
          <Link
            to={`/catalogo?catalogo=${producto.catalogo || 'hombre'}&categoria=${producto.categoria_id}`}
            className="transition-colors hover:text-ink"
          >
            {producto.categoria}
          </Link>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Imagen */}
          <div className="overflow-hidden rounded-3xl border border-line bg-surface-2">
            <img
              src={producto.imagen_url}
              alt={producto.nombre}
              className="h-auto w-full object-cover"
            />
          </div>

          {/* Información */}
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-2">
              {producto.categoria}
              {producto.subcategoria ? ` · ${producto.subcategoria}` : ''}
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
              {producto.nombre}
            </h1>
            <p className="mt-3 text-2xl font-bold text-ink">{formato(producto.precio)}</p>

            <p className="mt-5 text-sm leading-relaxed text-ink-2">{producto.descripcion}</p>

            {/* Tallas */}
            <div className="mt-8">
              <p className="mb-2 text-sm font-semibold text-ink">
                {tieneTallas ? 'Talla' : 'Presentación'}
                {tieneTallas && (
                  <span className="ml-1 font-normal text-ink-2">(elige tu talla)</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {producto.variantes.map((v) => (
                  <button
                    key={v.talla || 'unica'}
                    type="button"
                    onClick={() => elegirTalla(v.talla)}
                    className={`min-w-14 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                      talla === v.talla
                        ? 'border-ink bg-ink text-white'
                        : 'border-line text-ink hover:border-ink-2/50'
                    }`}
                  >
                    {v.talla || 'Única'}
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad + agregar */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-line">
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  className="flex h-12 w-12 items-center justify-center text-ink-2 transition-colors hover:text-ink active:scale-90"
                  aria-label="Disminuir cantidad"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold text-ink">{cantidad}</span>
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.min(stockVariante, c + 1))}
                  disabled={cantidad >= stockVariante}
                  className="flex h-12 w-12 items-center justify-center text-ink-2 transition-colors hover:text-ink active:scale-90 disabled:opacity-30"
                  aria-label="Aumentar cantidad"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={agregarAlCarrito}
                disabled={!variante}
                className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
                  agregado ? 'bg-emerald-700' : 'bg-ink hover:bg-metal-2'
                }`}
              >
                {agregado ? (
                  <>
                    <CheckIcon className="h-5 w-5" /> ¡Agregado!
                  </>
                ) : (
                  <>
                    <CartIcon className="h-5 w-5" /> Agregar al carrito
                  </>
                )}
              </button>
            </div>

            {tieneTallas && talla === null && (
              <p className="mt-2 text-xs text-ink-2">
                Selecciona una talla para agregar al carrito.
              </p>
            )}

            {/* Notas */}
            <div className="mt-8 space-y-2 rounded-2xl border border-line bg-surface-2/50 p-4 text-xs text-ink-2">
              <p>· Stock por talla exacta: disponible en las 4 sedes.</p>
              <p>· Pago seguro con Wompi (tarjeta de crédito o débito).</p>
              <p>· Envíos a todo el país.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}