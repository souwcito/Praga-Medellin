import { useEffect, useMemo, useState } from 'react'
import { catalogApi, devolucionesApi, ventasApi } from '../services/api'
import PeriodFilter from '../components/PeriodFilter'
import {
  AlertIcon,
  CheckIcon,
  CoinsIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  StoreIcon,
  SwapIcon,
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
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-2/50 transition-colors focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const fechaLarga = (iso) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
]

export default function Devoluciones() {
  const [tab, setTab] = useState('registrar')

  return (
    <div className="animate-fade-up mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Devoluciones
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Cambios y devoluciones internas en punto físico, con control de inventario.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-xl border border-line bg-surface-2 p-1">
        {[
          { value: 'registrar', label: 'Registrar' },
          { value: 'historial', label: 'Historial' },
        ].map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all duration-200 ${
              tab === t.value ? 'bg-ink text-white shadow-sm' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'registrar' ? <Registrar /> : <Historial />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pestaña: Registrar
// ---------------------------------------------------------------------------

function Registrar() {
  const [tipo, setTipo] = useState('cambio') // 'cambio' | 'reembolso'
  const [sedes, setSedes] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [sedeId, setSedeId] = useState('')
  const [vendedorId, setVendedorId] = useState('')

  const [facturaInput, setFacturaInput] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [facturaError, setFacturaError] = useState(null)
  const [ventaInfo, setVentaInfo] = useState(null)
  const [devueltos, setDevueltos] = useState([])

  const [variantes, setVariantes] = useState([])
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [cambioCart, setCambioCart] = useState([])

  const [metodoPago, setMetodoPago] = useState('')
  const [motivo, setMotivo] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [registroError, setRegistroError] = useState(null)
  const [resultado, setResultado] = useState(null)

  useEffect(() => {
    Promise.all([catalogApi.getSedes(), catalogApi.getEmpleados()])
      .then(([s, e]) => {
        setSedes(s)
        setEmpleados(e)
      })
      .catch((err) => setFacturaError(err?.message || 'Error cargando datos'))
  }, [])

  useEffect(() => {
    if (!sedeId) return
    catalogApi
      .getInventario(sedeId)
      .then(setVariantes)
      .catch((err) => setRegistroError(err?.message || 'Error cargando inventario'))
      .finally(() => setCargandoCatalogo(false))
  }, [sedeId])

  const variantesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return variantes
    return variantes.filter(
      (v) =>
        v.nombre.toLowerCase().includes(q) ||
        v.codigo_barras.toLowerCase().includes(q) ||
        (v.talla || '').toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q),
    )
  }, [variantes, busqueda])

  const totalDevuelto = useMemo(
    () => devueltos.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0),
    [devueltos],
  )
  const totalCambio = useMemo(
    () => cambioCart.reduce((s, i) => s + i.cantidad * i.precio, 0),
    [cambioCart],
  )
  const diferencia = totalCambio - totalDevuelto

  const tieneDevuelto = devueltos.some((i) => i.cantidad > 0)
  const puedeConfirmar =
    Boolean(sedeId && vendedorId && ventaInfo) &&
    tieneDevuelto &&
    (tipo === 'reembolso'
      ? Boolean(metodoPago)
      : cambioCart.length > 0 && diferencia >= 0 && (diferencia === 0 || Boolean(metodoPago)))

  function cambiarTipo(nuevoTipo) {
    if (nuevoTipo === tipo) return
    setTipo(nuevoTipo)
    setCambioCart([])
    setBusqueda('')
    setMetodoPago('')
    setRegistroError(null)
  }

  async function buscarFactura(e) {
    e.preventDefault()
    const factura = facturaInput.trim()
    if (!factura) return
    setBuscando(true)
    setFacturaError(null)
    setVentaInfo(null)
    setDevueltos([])
    setCambioCart([])
    setMetodoPago('')
    try {
      const res = await ventasApi.buscarPorFactura(factura)
      setVentaInfo(res)
      setDevueltos(
        res.items.map((it) => ({
          variante_id: it.variante_id,
          nombre: it.nombre,
          talla: it.talla,
          precio_unitario: it.precio_unitario,
          vendido: it.cantidad,
          cantidad: it.cantidad,
        })),
      )
    } catch (err) {
      setFacturaError(err?.message || 'No se pudo buscar la factura')
    } finally {
      setBuscando(false)
    }
  }

  function cambiarSede(e) {
    const value = e.target.value
    setSedeId(value)
    setCambioCart([])
    setRegistroError(null)
    if (value) setCargandoCatalogo(true)
  }

  function cambiarDevuelto(variante_id, cantidad) {
    setDevueltos((prev) =>
      prev.map((i) =>
        i.variante_id === variante_id
          ? { ...i, cantidad: Math.max(0, Math.min(i.vendido, cantidad)) }
          : i,
      ),
    )
  }

  function agregarCambio(variante) {
    setCambioCart((prev) => {
      const existente = prev.find((i) => i.variante_id === variante.variante_id)
      if (existente) {
        if (existente.cantidad >= variante.stock) return prev
        return prev.map((i) =>
          i.variante_id === variante.variante_id ? { ...i, cantidad: i.cantidad + 1 } : i,
        )
      }
      return [...prev, { ...variante, cantidad: 1 }]
    })
  }

  function cambiarCantidadCambio(variante_id, cantidad) {
    setCambioCart((prev) =>
      prev.map((i) =>
        i.variante_id === variante_id
          ? { ...i, cantidad: Math.max(1, Math.min(i.stock, cantidad)) }
          : i,
      ),
    )
  }

  function eliminarCambio(variante_id) {
    setCambioCart((prev) => prev.filter((i) => i.variante_id !== variante_id))
  }

  async function confirmar() {
    if (!puedeConfirmar) return
    setConfirmando(true)
    setRegistroError(null)
    try {
      const payload = {
        venta_id: ventaInfo.venta.id,
        sede_id: Number(sedeId),
        empleado_id: Number(vendedorId),
        tipo,
        devueltos: devueltos
          .filter((i) => i.cantidad > 0)
          .map((i) => ({
            variante_id: i.variante_id,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
          })),
        cambios: tipo === 'reembolso' ? [] : cambioCart.map((i) => ({
          variante_id: i.variante_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio,
        })),
        metodo_pago:
          tipo === 'reembolso' || diferencia > 0 ? metodoPago : undefined,
        motivo: motivo.trim() || undefined,
      }
      const res = await devolucionesApi.registrar(payload)
      setResultado(res)
      setVentaInfo(null)
      setDevueltos([])
      setCambioCart([])
      setMetodoPago('')
      setMotivo('')
      setFacturaInput('')
      catalogApi.getInventario(sedeId).then(setVariantes).catch(() => {})
    } catch (err) {
      setRegistroError(err?.message || 'No se pudo registrar la devolución')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div>
      {registroError && (
        <div className="animate-fade-in mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {registroError}
        </div>
      )}

      {/* Tipo de operación */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => cambiarTipo('cambio')}
          className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
            tipo === 'cambio'
              ? 'border-ink bg-ink text-white shadow-sm'
              : 'border-line bg-white text-ink hover:border-ink-2/40'
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              tipo === 'cambio' ? 'bg-white/15 text-white' : 'bg-surface-2 text-ink-2'
            }`}
          >
            <SwapIcon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Cambio por otro producto</span>
            <span
              className={`block text-xs ${tipo === 'cambio' ? 'text-white/70' : 'text-ink-2/70'}`}
            >
              Devuelve uno y se lleva otro de igual o mayor valor.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => cambiarTipo('reembolso')}
          className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
            tipo === 'reembolso'
              ? 'border-metal bg-metal-2 text-white shadow-sm'
              : 'border-line bg-white text-ink hover:border-metal/40'
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              tipo === 'reembolso' ? 'bg-white/15 text-white' : 'bg-surface-2 text-ink-2'
            }`}
          >
            <CoinsIcon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Devolución de dinero (interno)</span>
            <span
              className={`block text-xs ${tipo === 'reembolso' ? 'text-white/70' : 'text-ink-2/70'}`}
            >
              Caso extremo: entrega de dinero en caja que descuenta de ingresos.
            </span>
          </span>
        </button>
      </div>

      {/* Selectores de sede y vendedor */}
      <div className="mb-5 grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <StoreIcon className="h-4 w-4" /> Sede
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

        {/* Buscador de factura */}
        <form onSubmit={buscarFactura} className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
            Factura original
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={facturaInput}
              onChange={(e) => setFacturaInput(e.target.value)}
              placeholder="Ej. FAC-1001"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={buscando || !facturaInput.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-metal-2 active:scale-[0.98] disabled:opacity-40"
            >
              {buscando ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <SearchIcon className="h-4 w-4" />
              )}
              Buscar
            </button>
          </div>
          {facturaError && <p className="mt-1.5 text-xs text-red-700">{facturaError}</p>}
        </form>
      </div>

      {!ventaInfo ? (
        <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
          Busca la factura de la compra para iniciar la operación.
        </div>
      ) : (
        <>
          {/* Resumen de la venta original */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white">
                {tipo === 'reembolso' ? <CoinsIcon className="h-5 w-5" /> : <SwapIcon className="h-5 w-5" />}
              </span>
              <div>
                <p className="font-display text-lg font-semibold tracking-tight text-ink">
                  {ventaInfo.venta.factura}
                </p>
                <p className="text-xs text-ink-2">
                  {fechaLarga(ventaInfo.venta.fecha)} · {ventaInfo.venta.sede_venta}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-2">Total de la compra original</p>
              <p className="text-lg font-bold text-ink">{formato(ventaInfo.venta.total)}</p>
            </div>
          </div>

          {tipo === 'reembolso' && (
            <div className="animate-fade-in mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                <strong>Uso interno y autorizado:</strong> solo para casos extremos. El dinero
                entregado se descuenta de los ingresos y los productos devueltos vuelven al stock de
                la sede. El cliente no ve esta operación como parte del historial público.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
            {/* Artículos devueltos */}
            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="mb-1 font-display text-lg font-semibold tracking-tight text-ink">
                ¿Qué devuelve?
              </h2>
              <p className="mb-4 text-xs text-ink-2/70">
                Selecciona la cantidad a devolver de cada artículo de la factura.
              </p>

              <ul className="space-y-3">
                {devueltos.map((i) => (
                  <li
                    key={i.variante_id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{i.nombre}</p>
                      <p className="text-xs text-ink-2">
                        {i.talla ? `Talla ${i.talla} · ` : ''}
                        {formato(i.precio_unitario)} · vendido {i.vendido}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cambiarDevuelto(i.variante_id, i.cantidad - 1)}
                        disabled={i.cantidad <= 0}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 transition-colors hover:text-ink active:scale-90 disabled:opacity-30"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        value={i.cantidad}
                        min={0}
                        max={i.vendido}
                        onChange={(e) =>
                          cambiarDevuelto(i.variante_id, parseInt(e.target.value, 10) || 0)
                        }
                        className="w-12 rounded-lg border border-line py-1.5 text-center text-sm font-semibold text-ink focus:border-metal focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => cambiarDevuelto(i.variante_id, i.cantidad + 1)}
                        disabled={i.cantidad >= i.vendido}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 transition-colors hover:text-ink active:scale-90 disabled:opacity-30"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
                <span className="text-sm text-ink-2">Total devuelto</span>
                <span className="text-lg font-bold text-ink">{formato(totalDevuelto)}</span>
              </div>
            </section>

            {/* Panel derecho: cambio o reembolso */}
            {tipo === 'cambio' ? (
              <section className="rounded-2xl border border-line bg-white p-5">
                <h2 className="mb-1 font-display text-lg font-semibold tracking-tight text-ink">
                  ¿Qué se lleva a cambio?
                </h2>
                <p className="mb-4 text-xs text-ink-2/70">
                  Elige del catálogo los productos de igual o mayor valor que lo devuelto.
                </p>

                <div className="relative mb-3">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/60" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre, talla o código…"
                    className={`${inputCls} pl-9`}
                  />
                </div>

                {!sedeId ? (
                  <div className="grid h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-ink-2/70">
                    Selecciona una sede para ver el stock disponible.
                  </div>
                ) : cargandoCatalogo ? (
                  <div className="grid h-40 place-items-center text-sm text-ink-2/70">
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
                      Cargando inventario…
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3">
                      {variantesFiltradas.map((v) => (
                        <button
                          key={v.variante_id}
                          type="button"
                          onClick={() => agregarCambio(v)}
                          className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-metal"
                        >
                          <div className="relative aspect-square overflow-hidden bg-surface-2">
                            <img
                              src={v.imagen_url}
                              alt={v.nombre}
                              className="h-full w-full object-cover"
                            />
                            {v.talla && (
                              <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                {v.talla}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col p-2">
                            <p className="line-clamp-2 text-xs font-medium text-ink">{v.nombre}</p>
                            <p className="mt-1 text-xs font-bold text-ink">{formato(v.precio)}</p>
                            <p className="text-[10px] text-ink-2/70">stock {v.stock}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {cambioCart.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
                          A llevar ({cambioCart.length})
                        </p>
                        <ul className="space-y-2">
                          {cambioCart.map((i) => (
                            <li
                              key={i.variante_id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-line p-2.5"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-ink">{i.nombre}</p>
                                <p className="text-xs text-ink-2">
                                  {i.talla ? `Talla ${i.talla} · ` : ''}
                                  {formato(i.precio)} · stock {i.stock}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <div className="flex items-center rounded-lg border border-line">
                                  <button
                                    type="button"
                                    onClick={() => cambiarCantidadCambio(i.variante_id, i.cantidad - 1)}
                                    className="flex h-7 w-7 items-center justify-center text-ink-2 hover:text-ink active:scale-90"
                                  >
                                    <MinusIcon className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="w-7 text-center text-sm font-semibold text-ink">
                                    {i.cantidad}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => cambiarCantidadCambio(i.variante_id, i.cantidad + 1)}
                                    disabled={i.cantidad >= i.stock}
                                    className="flex h-7 w-7 items-center justify-center text-ink-2 hover:text-ink active:scale-90 disabled:opacity-30"
                                  >
                                    <PlusIcon className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => eliminarCambio(i.variante_id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-2/40 transition-colors hover:bg-red-50 hover:text-red-700"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </section>
            ) : (
              <section className="rounded-2xl border border-metal/30 bg-metal-2/5 p-5">
                <h2 className="mb-1 font-display text-lg font-semibold tracking-tight text-ink">
                  Entrega de dinero
                </h2>
                <p className="mb-4 text-xs text-ink-2/70">
                  Se entrega en caja el valor devuelto y los productos regresan al inventario.
                </p>

                <div className="mb-4 rounded-xl bg-surface-2 px-4 py-3">
                  <p className="text-sm text-ink-2">Dinero a entregar</p>
                  <p className="text-2xl font-bold text-ink">{formato(totalDevuelto)}</p>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                      Método de entrega del dinero
                    </span>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Selecciona…</option>
                      {METODOS_PAGO.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                      Motivo interno <span className="normal-case text-ink-2/60">(opcional)</span>
                    </span>
                    <input
                      type="text"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ej. cliente insatisfecho, política especial…"
                      className={inputCls}
                    />
                  </label>
                </div>
              </section>
            )}
          </div>

          {/* Totales y confirmación */}
          <div className="mt-6 rounded-2xl border border-line bg-white p-5">
            {tipo === 'cambio' ? (
              <>
                <div className="mb-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-surface-2 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Devuelto</p>
                    <p className="mt-1 text-xl font-bold text-ink">{formato(totalDevuelto)}</p>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Cambio</p>
                    <p className="mt-1 text-xl font-bold text-ink">{formato(totalCambio)}</p>
                  </div>
                  <div
                    className={`rounded-xl p-4 ${
                      diferencia > 0
                        ? 'bg-ink text-white'
                        : diferencia < 0
                          ? 'bg-red-50'
                          : 'bg-surface-2'
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        diferencia > 0
                          ? 'text-white/70'
                          : diferencia < 0
                            ? 'text-red-700'
                            : 'text-ink-2'
                      }`}
                    >
                      {diferencia < 0 ? 'Falta por devolver' : 'Diferencia a pagar'}
                    </p>
                    <p
                      className={`mt-1 text-xl font-bold ${
                        diferencia > 0
                          ? 'text-white'
                          : diferencia < 0
                            ? 'text-red-700'
                            : 'text-ink'
                      }`}
                    >
                      {formato(Math.abs(diferencia))}
                    </p>
                  </div>
                </div>

                {diferencia < 0 && (
                  <p className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertIcon className="h-4 w-4 shrink-0" />
                    El cambio no puede ser de menor valor que lo devuelto. Agrega productos por{' '}
                    {formato(-diferencia)} más.
                  </p>
                )}
              </>
            ) : (
              <div className="mb-4 rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Dinero entregado (descuenta de ingresos)
                </p>
                <p className="mt-1 text-xl font-bold text-ink">{formato(totalDevuelto)}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {tipo === 'cambio' && diferencia > 0 && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                    Método de pago de la diferencia
                  </span>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Selecciona…</option>
                    {METODOS_PAGO.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className={`block ${tipo === 'cambio' && diferencia > 0 ? '' : 'sm:col-span-2'}`}>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Motivo{' '}
                  <span className="normal-case text-ink-2/60">
                    (interno {tipo === 'reembolso' ? '· obligatorio recomendado' : 'opcional'})
                  </span>
                </span>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder={
                    tipo === 'reembolso'
                      ? 'Justifica la entrega de dinero (registro interno)'
                      : 'Ej. no le sirvió la talla, cambió de opinión…'
                  }
                  className={inputCls}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={confirmar}
              disabled={!puedeConfirmar || confirmando}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:bg-metal-2 hover:shadow-lg hover:shadow-ink/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {confirmando ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Registrando…
                </span>
              ) : tipo === 'reembolso' ? (
                <>
                  <CoinsIcon className="h-5 w-5" />
                  Registrar devolución de dinero
                </>
              ) : (
                <>
                  <SwapIcon className="h-5 w-5" />
                  Registrar cambio
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* Modal de éxito */}
      {resultado && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
                  <CheckIcon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                  {resultado.tipo === 'reembolso' ? 'Devolución de dinero registrada' : 'Cambio registrado'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResultado(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 rounded-xl bg-surface-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-2">N° devolución</span>
                <span className="font-semibold text-ink">{resultado.numero_interno}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Factura original</span>
                <span className="font-semibold text-ink">{resultado.factura}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Devuelto</span>
                <span className="font-semibold text-ink">{formato(resultado.total_devuelto)}</span>
              </div>
              {resultado.tipo === 'reembolso' ? (
                <div className="flex justify-between">
                  <span className="text-ink-2">Dinero entregado ({resultado.metodo_pago})</span>
                  <span className="font-bold text-ink">{formato(resultado.reembolsado ?? resultado.total_devuelto)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-ink-2">Cambio</span>
                    <span className="font-semibold text-ink">{formato(resultado.total_cambio)}</span>
                  </div>
                  {resultado.diferencia > 0 && (
                    <div className="flex justify-between">
                      <span className="text-ink-2">Diferencia ({resultado.metodo_pago})</span>
                      <span className="font-bold text-ink">{formato(resultado.diferencia)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <p className="mt-3 text-center text-xs text-ink-2/70">
              El inventario de la sede ya fue actualizado.
            </p>

            <button
              type="button"
              onClick={() => setResultado(null)}
              className="mt-5 w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98]"
            >
              Seguir registrando
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pestaña: Historial
// ---------------------------------------------------------------------------

function Historial() {
  const [sedes, setSedes] = useState([])
  const [empleados, setEmpleados] = useState([])

  const [periodo, setPeriodo] = useState('mes')
  const [sedeId, setSedeId] = useState('')
  const [empleadoId, setEmpleadoId] = useState('')
  const [tipo, setTipo] = useState('')
  const [page, setPage] = useState(1)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  useEffect(() => {
    Promise.all([catalogApi.getSedes(), catalogApi.getEmpleados()])
      .then(([s, e]) => {
        setSedes(s)
        setEmpleados(e)
      })
      .catch((err) => setError(err?.message || 'Error cargando filtros'))
  }, [])

  useEffect(() => {
    devolucionesApi
      .getHistorial({
        periodo,
        sede_id: sedeId || undefined,
        empleado_id: empleadoId || undefined,
        tipo: tipo || undefined,
        page,
        per_page: 10,
      })
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando las devoluciones'))
      .finally(() => setLoading(false))
  }, [periodo, sedeId, empleadoId, tipo, page])

  function cambiarPeriodo(p) {
    if (p === periodo) return
    setPeriodo(p)
    setPage(1)
    setLoading(true)
  }

  function cambiarSede(e) {
    setSedeId(e.target.value)
    setPage(1)
    setLoading(true)
  }

  function cambiarEmpleado(e) {
    setEmpleadoId(e.target.value)
    setPage(1)
    setLoading(true)
  }

  function cambiarTipo(e) {
    setTipo(e.target.value)
    setPage(1)
    setLoading(true)
  }

  function irA(pagina) {
    setPage(pagina)
    setLoading(true)
  }

  async function abrirDetalle(id) {
    setCargandoDetalle(true)
    try {
      const d = await devolucionesApi.getDetalle(id)
      setDetalle(d)
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el detalle')
    } finally {
      setCargandoDetalle(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-up">
        <div className="mb-6 h-8 w-72 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-10 w-full animate-pulse rounded-xl border border-line bg-surface-2" />
        <div className="mt-4 h-96 animate-pulse rounded-2xl border border-line bg-surface-2" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-fade-in flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertIcon className="h-5 w-5 shrink-0" />
        {error}
      </div>
    )
  }

  const { data: filas, meta, resumen } = data

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-ink-2">
          {meta.total} operaciones · {formato(resumen.totalDevuelto)} devueltos ·{' '}
          {formato(resumen.totalCambio)} en cambio
          {resumen.totalReembolsado > 0 && (
            <>
              {' '}
              · <span className="font-medium text-ink">{formato(resumen.totalReembolsado)} reembolsados</span>{' '}
              (descontado de ingresos)
            </>
          )}
          .
        </p>
        <PeriodFilter value={periodo} onChange={cambiarPeriodo} />
      </div>

      {/* Filtros */}
      <div className="mb-4 grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <StoreIcon className="h-4 w-4" /> Sede
          </span>
          <select value={sedeId} onChange={cambiarSede} className={selectCls}>
            <option value="">Todas las sedes</option>
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
          <select value={empleadoId} onChange={cambiarEmpleado} className={selectCls}>
            <option value="">Todos los vendedores</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
            Tipo
          </span>
          <select value={tipo} onChange={cambiarTipo} className={selectCls}>
            <option value="">Todos</option>
            <option value="cambio">Cambio</option>
            <option value="reembolso">Reembolso (interno)</option>
          </select>
        </label>

        <div className="hidden items-end sm:flex">
          <span className="text-sm text-ink-2">
            Página {meta.current_page} de {meta.last_page}.
          </span>
        </div>
      </div>

      {/* Tabla */}
      {filas.length === 0 ? (
        <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
          Sin operaciones para los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[6rem_6.5rem_5.5rem_1fr_8.5rem_1fr_7rem_7rem] items-center gap-3 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <span>N° Dev</span>
            <span>Factura</span>
            <span>Tipo</span>
            <span>Fecha</span>
            <span>Vendedor</span>
            <span>Sede</span>
            <span className="text-right">Monto</span>
            <span className="text-center">Estado</span>
          </div>

          <ul className="divide-y divide-line">
            {filas.map((d) => (
              <li
                key={d.id}
                onClick={() => abrirDetalle(d.id)}
                className="grid cursor-pointer grid-cols-[6rem_6.5rem_5.5rem_1fr_8.5rem_1fr_7rem_7rem] items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-surface-2/50"
              >
                <span className="font-medium text-ink">{d.numero_interno}</span>
                <span className="text-ink-2">{d.factura || '—'}</span>
                <span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                      d.tipo === 'reembolso'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'border border-line bg-surface-2 text-ink-2'
                    }`}
                  >
                    {d.tipo === 'reembolso' ? 'Reembolso' : 'Cambio'}
                  </span>
                </span>
                <span className="truncate text-ink">{fechaLarga(d.fecha)}</span>
                <span className="truncate text-ink">{d.empleado.nombre}</span>
                <span className="truncate text-ink-2">{d.sede}</span>
                <span
                  className={`text-right font-semibold ${
                    d.tipo === 'reembolso' ? 'text-red-700' : d.diferencia > 0 ? 'text-ink' : 'text-ink-2'
                  }`}
                >
                  {d.tipo === 'reembolso'
                    ? `-${formato(d.reembolsado ?? d.total_devuelto)}`
                    : d.diferencia > 0
                      ? formato(d.diferencia)
                      : '—'}
                </span>
                <span className="justify-self-center">
                  <span className="inline-flex rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium capitalize text-ink-2">
                    {d.estado}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Paginación */}
      {meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-ink-2">
            Mostrando {filas.length} de {meta.total} operaciones
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => irA(meta.current_page - 1)}
              disabled={meta.current_page <= 1}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-ink-2">
              Página {meta.current_page} de {meta.last_page}
            </span>
            <button
              type="button"
              onClick={() => irA(meta.current_page + 1)}
              disabled={meta.current_page >= meta.last_page}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalle */}
      {detalle && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                  {detalle.numero_interno}
                </h3>
                <p className="text-xs text-ink-2">
                  Factura {detalle.factura || '—'} · {fechaLarga(detalle.fecha)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetalle(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {cargandoDetalle ? (
              <div className="grid h-32 place-items-center">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-4 py-2.5 text-sm">
                  <span className="text-ink-2">
                    {detalle.empleado.nombre} · {detalle.sede}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                      detalle.tipo === 'reembolso'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'border border-line bg-white text-ink-2'
                    }`}
                  >
                    {detalle.tipo === 'reembolso' ? 'Reembolso (interno)' : 'Cambio'}
                  </span>
                </div>

                {detalle.tipo === 'reembolso' && detalle.motivo && (
                  <p className="mb-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink">
                    <span className="text-ink-2">Motivo interno: </span>
                    {detalle.motivo}
                  </p>
                )}

                {['devuelto', 'cambio'].map((t) => {
                  const items = (detalle.items || []).filter((i) => i.tipo === t)
                  if (items.length === 0) return null
                  return (
                    <div key={t} className="mb-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
                        {t === 'devuelto' ? 'Devueltos' : 'A cambio'}
                      </p>
                      <ul className="space-y-1.5">
                        {items.map((i) => (
                          <li
                            key={i.id}
                            className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-ink">{i.nombre}</span>
                              <span className="block text-xs text-ink-2">
                                {i.talla ? `Talla ${i.talla} · ` : ''}
                                {formato(i.precio_unitario)} × {i.cantidad}
                              </span>
                            </span>
                            <span className="font-semibold text-ink">{formato(i.subtotal)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}

                <div className="space-y-1.5 rounded-xl bg-surface-2 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-2">Total devuelto</span>
                    <span className="font-semibold text-ink">{formato(detalle.total_devuelto)}</span>
                  </div>
                  {detalle.tipo === 'reembolso' ? (
                    <div className="flex justify-between">
                      <span className="text-ink-2">Dinero entregado ({detalle.metodo_pago})</span>
                      <span className="font-bold text-red-700">
                        -{formato(detalle.reembolsado ?? detalle.total_devuelto)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-ink-2">Total cambio</span>
                        <span className="font-semibold text-ink">{formato(detalle.total_cambio)}</span>
                      </div>
                      {detalle.diferencia > 0 && (
                        <div className="flex justify-between">
                          <span className="text-ink-2">Diferencia</span>
                          <span className="font-bold text-ink">{formato(detalle.diferencia)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}