import { useEffect, useMemo, useRef, useState } from 'react'
import { catalogApi, ventasApi } from '../services/api'
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

export default function Pos() {
  const [sedes, setSedes] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [sedeId, setSedeId] = useState('')
  const [vendedorId, setVendedorId] = useState('')

  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [cart, setCart] = useState([])
  const [confirmando, setConfirmando] = useState(false)

  const [ventaResult, setVentaResult] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  const searchRef = useRef(null)

  // Carga sedes y vendedores al entrar
  useEffect(() => {
    Promise.all([catalogApi.getSedes(), catalogApi.getEmpleados()])
      .then(([s, e]) => {
        setSedes(s)
        setEmpleados(e)
      })
      .catch((err) => setError(err?.message || 'Error cargando datos'))
  }, [])

  // Al elegir sede, carga SOLO los productos con stock en esa sede.
  // El estado "cargando" se activa en cambiarSede (evento) para no usar setState síncrono aquí.
  useEffect(() => {
    if (!sedeId) return
    catalogApi
      .getInventario(sedeId)
      .then(setProductos)
      .catch((err) => setError(err?.message || 'Error cargando inventario'))
      .finally(() => setCargando(false))
  }, [sedeId])

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo_barras.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q),
    )
  }, [productos, busqueda])

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0),
    [cart],
  )

  const sedeNombre = sedes.find((s) => s.id === Number(sedeId))?.nombre
  const puedeConfirmar = Boolean(sedeId && vendedorId && cart.length > 0)

  function cambiarSede(e) {
    const value = e.target.value
    setSedeId(value)
    setError(null)
    if (value) {
      setCargando(true)
    } else {
      setProductos([])
    }
    // Al cambiar de sede se limpia la venta: evita mezclar stock de sedes distintas
    setCart([])
    setBusqueda('')
    searchRef.current?.focus()
  }

  function agregar(producto) {
    setCart((prev) => {
      const existente = prev.find((i) => i.producto_id === producto.producto_id)
      if (existente) {
        if (existente.cantidad >= producto.stock) return prev
        return prev.map((i) =>
          i.producto_id === producto.producto_id ? { ...i, cantidad: i.cantidad + 1 } : i,
        )
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
    searchRef.current?.focus()
  }

  function cambiarCantidad(producto_id, cantidad) {
    setCart((prev) =>
      prev.map((i) =>
        i.producto_id === producto_id
          ? { ...i, cantidad: Math.max(1, Math.min(i.stock, cantidad)) }
          : i,
      ),
    )
  }

  function eliminar(producto_id) {
    setCart((prev) => prev.filter((i) => i.producto_id !== producto_id))
  }

  async function confirmarVenta() {
    if (!puedeConfirmar) return
    setConfirmando(true)
    setError(null)
    try {
      const payload = {
        empleado_id: Number(vendedorId),
        sede_venta_id: Number(sedeId),
        tipo: 'presencial',
        items: cart.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio,
        })),
      }
      const result = await ventasApi.createVenta(payload)
      setVentaResult(result)
      setModalAbierto(true)
      setCart([])
      setBusqueda('')
      // Refresca el stock visible de la sede tras el descuento
      catalogApi.getInventario(sedeId).then(setProductos).catch(() => {})
    } catch (err) {
      setError(err?.message || 'No se pudo registrar la venta')
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
            Busca por nombre o código de barras y registra la venta.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-2" />
          Presencial
        </span>
      </div>

      {error && (
        <div className="animate-fade-in mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Selectores de venta */}
      <div className="mb-6 grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
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
        {/* Catálogo filtrado por stock de la sede */}
        <section>
          <div className="relative mb-4">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2/60" />
            <input
              ref={searchRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código de barras… (el lector escribe y da Enter)"
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
          ) : productosFiltrados.length === 0 ? (
            <div className="animate-fade-in grid h-64 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
              {busqueda
                ? 'Sin resultados para esa búsqueda.'
                : 'Esta sede no tiene productos con stock.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {productosFiltrados.map((p, i) => (
                <button
                  key={p.producto_id}
                  type="button"
                  onClick={() => agregar(p)}
                  style={{ animationDelay: `${Math.min(i, 14) * 35}ms` }}
                  className="animate-fade-up group flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:border-metal hover:shadow-[0_12px_32px_-12px_rgba(10,10,10,0.18)]"
                >
                  <div className="relative aspect-square overflow-hidden bg-surface-2">
                    <img
                      src={p.imagen_url}
                      alt={p.nombre}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    {p.stock <= 5 && (
                      <span className="absolute right-2 top-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                        Quedan {p.stock}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-2 text-sm font-medium text-ink">{p.nombre}</p>
                    <p className="mt-0.5 text-[11px] text-ink-2/70">Cód. {p.codigo_barras}</p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <span className="text-sm font-bold text-ink">{formato(p.precio)}</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white transition-all duration-200 group-hover:bg-metal group-active:scale-90">
                        <PlusIcon className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </button>
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
                  key={item.producto_id}
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
                      {formato(item.precio)} · stock {item.stock}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-line bg-white">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}
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
                              item.producto_id,
                              parseInt(e.target.value, 10) || 1,
                            )
                          }
                          className="w-10 border-x border-line py-1 text-center text-sm font-semibold text-ink focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock}
                          className="flex h-8 w-8 items-center justify-center text-ink-2 transition-colors hover:text-ink active:scale-90 disabled:opacity-30"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminar(item.producto_id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/40 transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-right text-sm font-semibold text-ink">
                      {formato(item.precio * item.cantidad)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <footer className="border-t border-line p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-ink-2">Total</span>
              <span
                key={total}
                className="animate-pop text-2xl font-bold text-ink"
              >
                {formato(total)}
              </span>
            </div>
            <button
              type="button"
              onClick={confirmarVenta}
              disabled={!puedeConfirmar || confirmando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:bg-metal-2 hover:shadow-lg hover:shadow-ink/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {confirmando ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Registrando venta…
                </span>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5" />
                  Confirmar venta
                </>
              )}
            </button>
          </footer>
        </aside>
      </div>

      {/* Modal de comprobante tras confirmar */}
      {modalAbierto && ventaResult && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
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

            <Comprobante data={ventaResult} />

            <div className="mt-5 flex gap-2">
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