import { memo, useDeferredValue, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ventasApi } from '../services/api'
import { useSedes, useEmpleados, useInventarioSede } from '../hooks/useData'
import { Comprobante } from '../components/Comprobante'
import { imprimirComprobante } from '../utils/print'
import {
  AlertIcon,
  CartIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  StoreIcon,
  TrashIcon,
  UserIcon,
  XIcon,
} from '../components/icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const selectCls =
  'select-field w-full rounded-lg border border-line bg-white px-3 py-2 pr-9 text-sm text-ink transition-colors focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const inputCls =
  'w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-sm placeholder:text-ink-2/50 transition-all duration-200 hover:border-ink-2/40 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const FORMAS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'banco', label: 'Banco' },
  { value: 'addi', label: 'Addi' },
  { value: 'sistecredito', label: 'Sistecredito' },
  { value: 'bold', label: 'Bold' },
]

// Precio final por línea (si se puso un precio con descuento, usa ese; si no, el estándar)
const precioFinalItem = (item) =>
  item.precio_final != null && item.precio_final !== '' ? Number(item.precio_final) : item.precio
const descuentoLinea = (item) => (item.precio - precioFinalItem(item)) * item.cantidad

// Tarjeta de producto (memoizada: el grid no se re-renderiza al escribir en el carrito)
const ProductoCard = memo(function ProductoCard({ v, i, onAgregar }) {
  return (
    <button
      type="button"
      onClick={() => onAgregar(v)}
      style={{ animationDelay: `${Math.min(i, 14) * 35}ms` }}
      className="animate-fade-up group flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:border-metal hover:shadow-[0_12px_32px_-12px_rgba(10,10,10,0.18)]"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        <img
          src={v.imagen_url}
          alt={v.nombre}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {v.stock <= 5 && (
          <span className="absolute right-2 top-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
            Quedan {v.stock}
          </span>
        )}
        {v.talla && (
          <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-white">
            {v.talla}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-medium text-ink">{v.nombre}</p>
        <p className="mt-0.5 text-[11px] text-ink-2/70">Cód. {v.codigo_barras}</p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-sm font-bold text-ink">{formato(v.precio)}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white transition-all duration-200 group-hover:bg-metal group-active:scale-90">
            <PlusIcon className="h-4 w-4" />
          </span>
        </div>
      </div>
    </button>
  )
})

export default function Pos() {
  const queryClient = useQueryClient()
  const { data: sedes = [] } = useSedes()
  const { data: empleados = [] } = useEmpleados()
  const [sedeId, setSedeId] = useState('')
  const [vendedorId, setVendedorId] = useState('')
  const [canal, setCanal] = useState('presencial')

  // Inventario de la sede con polling cada 20 s (React Query lo pausa si la
  // pestaña no es visible).
  const { data: variantes = [], isLoading: cargando, isError } = useInventarioSede(sedeId, {
    refetchInterval: 20000,
  })
  const [error, setError] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [cart, setCart] = useState([])
  const [confirmando, setConfirmando] = useState(false)

  const [ventaResult, setVentaResult] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [resumenAbierto, setResumenAbierto] = useState(false)
  const [pagos, setPagos] = useState([])

  const searchRef = useRef(null)

  // La búsqueda con useDeferredValue mantiene la UI fluida mientras se filtra
  const busquedaDeferred = useDeferredValue(busqueda)

  const variantesFiltradas = useMemo(() => {
    const q = busquedaDeferred.trim().toLowerCase()
    if (!q) return variantes
    return variantes.filter(
      (v) =>
        v.nombre.toLowerCase().includes(q) ||
        v.codigo_barras.toLowerCase().includes(q) ||
        (v.talla || '').toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q),
    )
  }, [variantes, busquedaDeferred])

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + precioFinalItem(i) * i.cantidad, 0),
    [cart],
  )

  const sumaPagos = useMemo(
    () => pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0),
    [pagos],
  )
  const pagosValidos = useMemo(
    () => pagos.some((p) => Number(p.monto) > 0) && sumaPagos === total,
    [pagos, sumaPagos, total],
  )

  const sedeNombre = sedes.find((s) => s.id === Number(sedeId))?.nombre
  const puedeConfirmar = Boolean(sedeId && vendedorId && cart.length > 0)

  function cambiarSede(e) {
    const value = e.target.value
    setSedeId(value)
    setError(null)
    // Al cambiar de sede se limpia la venta: evita mezclar stock de sedes distintas
    setCart([])
    setBusqueda('')
    searchRef.current?.focus()
  }

  function agregar(variante) {
    setCart((prev) => {
      const existente = prev.find((i) => i.variante_id === variante.variante_id)
      if (existente) {
        if (existente.cantidad >= variante.stock) return prev
        return prev.map((i) =>
          i.variante_id === variante.variante_id ? { ...i, cantidad: i.cantidad + 1 } : i,
        )
      }
      return [...prev, { ...variante, cantidad: 1 }]
    })
    searchRef.current?.focus()
  }

  function cambiarCantidad(variante_id, cantidad) {
    setCart((prev) =>
      prev.map((i) =>
        i.variante_id === variante_id
          ? { ...i, cantidad: Math.max(1, Math.min(i.stock, cantidad)) }
          : i,
      ),
    )
  }

  function eliminar(variante_id) {
    setCart((prev) => prev.filter((i) => i.variante_id !== variante_id))
  }

  function cambiarPrecioFinal(variante_id, value) {
    setCart((prev) =>
      prev.map((i) =>
        i.variante_id === variante_id
          ? {
              ...i,
              precio_final:
                value === '' ? '' : Math.max(1, Math.min(i.precio, Number(value) || 0)),
            }
          : i,
      ),
    )
  }

  function togglePago(metodo) {
    setPagos((prev) => {
      const existe = prev.some((p) => p.metodo_pago === metodo)
      if (existe) return prev.filter((p) => p.metodo_pago !== metodo)
      return [...prev, { metodo_pago: metodo, monto: '' }]
    })
  }

  function cambiarMonto(metodo, monto) {
    setPagos((prev) => prev.map((p) => (p.metodo_pago === metodo ? { ...p, monto } : p)))
  }

  // Primer paso: abre el resumen para revisar la venta antes de registrarla.
  function abrirResumen() {
    if (!puedeConfirmar) return
    setError(null)
    setPagos([{ metodo_pago: 'efectivo', monto: '' }])
    setResumenAbierto(true)
  }

  async function confirmarVenta() {
    if (!puedeConfirmar || !pagosValidos) return
    setConfirmando(true)
    setError(null)
    try {
      const payload = {
        empleado_id: Number(vendedorId),
        sede_venta_id: Number(sedeId),
        tipo: canal,
        items: cart.map((i) => ({
          variante_id: i.variante_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio,
          precio_final: precioFinalItem(i),
        })),
        pagos: pagos.map((p) => ({ metodo_pago: p.metodo_pago, monto: Number(p.monto) || 0 })),
      }
      const result = await ventasApi.createVenta(payload)
      setVentaResult(result)
      setResumenAbierto(false)
      setModalAbierto(true)
      setCart([])
      setBusqueda('')
      // Invalida el stock visible de la sede: se re-trae al instante
      queryClient.invalidateQueries({ queryKey: ['inventario', sedeId] })
    } catch (err) {
      setError(err?.error || err?.message || 'No se pudo registrar la venta')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div className="animate-fade-up mx-auto max-w-7xl">
      {/* Encabezado */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Punto de venta
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Busca por nombre, talla o código de barras y registra la venta.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-2" />
          {canal === 'virtual' ? 'Redes' : 'Punto físico'}
        </span>
      </div>

      {error && (
        <div className="animate-fade-in mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error || (isError ? 'No se pudo cargar el inventario de la sede' : '')}
        </div>
      )}

      {/* Selectores de venta */}
      <div className="mb-6 grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <StoreIcon className="h-4 w-4" /> Sede de la venta
          </span>
          <select value={sedeId} onChange={cambiarSede} className={selectCls}>
            <option value="">Selecciona una sede…</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <UserIcon className="h-4 w-4" /> Vendedor
          </span>
          <select
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
            className={selectCls}
          >
            <option value="">Selecciona un vendedor…</option>
            {empleados.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre} — {v.sede_nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <CartIcon className="h-4 w-4" /> Canal de la venta
          </span>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            className={selectCls}
          >
            <option value="presencial">Punto físico</option>
            <option value="virtual">Redes (Instagram / WhatsApp)</option>
          </select>
        </label>

        <div className="hidden sm:block lg:flex lg:flex-col lg:justify-end">
          <span className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            Stock disponible
          </span>
          {sedeNombre ? (
            <p className="animate-fade-in text-sm font-medium text-ink" key={sedeId}>
              {sedeNombre}
            </p>
          ) : (
            <p className="text-sm text-ink-2/70">Elige la sede para ver su inventario.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        {/* Catálogo de variantes con stock en la sede */}
        <section>
          <div className="relative mb-4">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2/60" />
            <input
              ref={searchRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, talla o código de barras… (el lector escribe y da Enter)"
              autoFocus
              className={inputCls}
            />
          </div>

          {cargando ? (
            <div className="grid h-64 place-items-center text-sm text-ink-2/70">
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
                Cargando inventario…
              </span>
            </div>
          ) : !sedeId ? (
            <div className="animate-fade-in grid h-64 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
              Selecciona una sede para cargar los productos disponibles.
            </div>
          ) : variantesFiltradas.length === 0 ? (
            <div className="animate-fade-in grid h-64 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
              {busqueda
                ? 'Sin resultados para esa búsqueda.'
                : 'Esta sede no tiene productos con stock.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {variantesFiltradas.map((v, i) => (
                <ProductoCard key={v.variante_id} v={v} i={i} onAgregar={agregar} />
              ))}
            </div>
          )}
        </section>

        {/* Carrito */}
        <aside className="flex h-[calc(100vh-16rem)] flex-col rounded-2xl border border-line bg-white xl:sticky xl:top-6">
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
                Venta actual
              </h2>
              <p className="text-xs text-ink-2/70">
                <span key={cart.length} className="inline-block animate-pop">
                  {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
                </span>
                {sedeNombre ? ` · ${sedeNombre}` : ''}
              </p>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs font-medium text-ink-2/70 transition-colors hover:text-red-700"
              >
                Vaciar
              </button>
            )}
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
                    <CartIcon className="h-7 w-7 text-ink-2/40" />
                  </div>
                  <p className="text-sm font-medium text-ink-2">Carrito vacío</p>
                  <p className="mt-1 text-xs text-ink-2/70">
                    Agrega productos desde el catálogo.
                  </p>
                </div>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.variante_id}
                  className="animate-slide-right flex gap-3 rounded-xl border border-line p-2.5 transition-colors hover:bg-surface-2/60"
                >
                  <img
                    src={item.imagen_url}
                    alt={item.nombre}
                    className="h-14 w-14 shrink-0 rounded-lg bg-surface-2 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.nombre}</p>
                    <p className="mt-0.5 text-xs text-ink-2/70">
                      {item.talla ? `Talla ${item.talla} · ` : ''}
                      {formato(item.precio)} · stock {item.stock}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-line bg-white">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.variante_id, item.cantidad - 1)}
                          className="flex h-8 w-8 items-center justify-center text-ink-2 transition-colors hover:text-ink active:scale-90"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          value={item.cantidad}
                          min={1}
                          max={item.stock}
                          onChange={(e) =>
                            cambiarCantidad(
                              item.variante_id,
                              parseInt(e.target.value, 10) || 1,
                            )
                          }
                          className="w-10 border-x border-line py-1 text-center text-sm font-semibold text-ink focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.variante_id, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock}
                          className="flex h-8 w-8 items-center justify-center text-ink-2 transition-colors hover:text-ink active:scale-90 disabled:opacity-30"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminar(item.variante_id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/40 transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                        Precio final
                        <input
                          type="number"
                          min={1}
                          max={item.precio}
                          value={item.precio_final ?? ''}
                          onChange={(e) => cambiarPrecioFinal(item.variante_id, e.target.value)}
                          placeholder={formato(item.precio)}
                          title="Precio al que se vende (vacío = precio estándar)"
                          className="w-24 rounded-lg border border-line bg-white px-2 py-1 text-right text-xs font-medium text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                        />
                      </label>
                      {descuentoLinea(item) > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-700">
                          −{formato(descuentoLinea(item))}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-right text-sm font-semibold text-ink">
                      {formato(precioFinalItem(item) * item.cantidad)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <footer className="border-t border-line p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-ink-2">Total</span>
              <span key={total} className="animate-pop text-2xl font-bold text-ink">
                {formato(total)}
              </span>
            </div>
            <button
              type="button"
              onClick={abrirResumen}
              disabled={!puedeConfirmar}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:bg-metal-2 hover:shadow-lg hover:shadow-ink/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckIcon className="h-5 w-5" />
              Confirmar venta
            </button>
          </footer>
        </aside>
      </div>

      {/* Resumen previo a registrar la venta (el stock se descuenta al confirmar aquí) */}
      {resumenAbierto && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-dark/70 p-4">
          <div className="animate-scale-in flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                  Revisa la venta
                </h3>
                <p className="text-xs text-ink-2/70">
                  Confirma los datos antes de registrar la venta y descontar el stock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResumenAbierto(false)}
                disabled={confirmando}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <dl className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">Sede</dt>
                  <dd className="font-medium text-ink">{sedeNombre || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">Vendedor</dt>
                  <dd className="font-medium text-ink">
                    {empleados.find((e) => e.id === Number(vendedorId))?.nombre || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">Canal</dt>
                  <dd className="font-medium text-ink">
                    {canal === 'virtual' ? 'Redes' : 'Punto físico'}
                  </dd>
                </div>
              </dl>

              <ul className="space-y-2 border-t border-line pt-3">
                {cart.map((item) => (
                  <li key={item.variante_id} className="flex items-center gap-3 text-sm">
                    <img
                      src={item.imagen_url}
                      alt={item.nombre}
                      className="h-10 w-10 shrink-0 rounded-lg bg-surface-2 object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {item.nombre}
                      {item.talla ? <span className="text-ink-2"> · {item.talla}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs text-ink-2">
                      {item.cantidad} × {formato(precioFinalItem(item))}
                    </span>
                    <span className="w-20 shrink-0 text-right font-semibold text-ink">
                      {formato(precioFinalItem(item) * item.cantidad)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Formas de pago (una o varias; la suma debe ser el total) */}
              <div className="mt-4 border-t border-line pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">Forma(s) de pago</p>
                  <span
                    className={`text-xs font-semibold ${
                      pagosValidos ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {pagosValidos
                      ? 'Pago completo'
                      : total - sumaPagos > 0
                        ? `Falta ${formato(total - sumaPagos)}`
                        : `Excede ${formato(sumaPagos - total)}`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {FORMAS_PAGO.map((f) => {
                    const activo = pagos.some((p) => p.metodo_pago === f.value)
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => togglePago(f.value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                          activo
                            ? 'border-ink bg-ink text-white'
                            : 'border-line bg-white text-ink-2 hover:border-ink-2/40'
                        }`}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>

                {pagos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {pagos.map((p) => (
                      <div key={p.metodo_pago} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-sm font-medium text-ink">
                          {FORMAS_PAGO.find((f) => f.value === p.metodo_pago)?.label}
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={p.monto}
                          onChange={(e) => cambiarMonto(p.metodo_pago, e.target.value)}
                          placeholder="0"
                          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-right text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line px-6 py-4">
              <span className="text-sm text-ink-2">Total</span>
              <span className="text-2xl font-bold text-ink">{formato(total)}</span>
            </div>

            <div className="flex gap-2 border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={() => setResumenAbierto(false)}
                disabled={confirmando}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmarVenta}
                disabled={!pagosValidos || confirmando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {confirmando ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Registrando…
                  </span>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Confirmar venta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de comprobante tras confirmar */}
      {modalAbierto && ventaResult && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-dark/70 p-4">
          <div className="animate-scale-in flex max-h-[92vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
                  <CheckIcon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                  Venta registrada
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <Comprobante data={ventaResult} />
            </div>

            <div className="flex gap-2 border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 active:scale-[0.98]"
              >
                Seguir facturando
              </button>
              <button
                type="button"
                onClick={() => imprimirComprobante(ventaResult)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98]"
              >
                <PrinterIcon className="h-4 w-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}