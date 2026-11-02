import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { entregasApi } from '../services/api'
import {
  useSedes,
  useEmpleados,
  useEntregas,
  useEntregaDetalle,
  useInventarioSede,
} from '../hooks/useData'
import Modal from '../components/Modal'
import { imprimirComprobanteEntrega } from '../utils/print'
import { normalizarTallaVisible } from '../utils/tallas'
import {
  AlertIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  StoreIcon,
  TrashIcon,
  TruckIcon,
  UserIcon,
  XIcon,
} from '../components/icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n || 0)

const fechaCorta = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    : '—'

const FORMAS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'banco', label: 'Banco' },
  { value: 'addi', label: 'Addi' },
  { value: 'sistecredito', label: 'Sistecredito' },
  { value: 'bold', label: 'Bold' },
]

const ESTADO_BADGE = {
  pendiente: 'border-amber-200 bg-amber-50 text-amber-800',
  facturada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelada: 'border-line bg-surface-2 text-ink-2',
}

// Color de la antigüedad: verde < 1 día, ámbar 1-3, rojo 4+
const colorDias = (dias) =>
  dias >= 4
    ? 'border-red-200 bg-red-50 text-red-700'
    : dias >= 1
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'

const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

function ahoraLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function Entregas() {
  const queryClient = useQueryClient()
  const { data: sedes = [] } = useSedes()
  const { data: empleados = [] } = useEmpleados()

  const [estado, setEstado] = useState('pendiente')
  const [sedeFiltro, setSedeFiltro] = useState('')
  const [q, setQ] = useState('')
  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [facturarId, setFacturarId] = useState(null)
  const [cancelar, setCancelar] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [error, setError] = useState(null)

  const params = useMemo(
    () => ({
      estado,
      sede_id: sedeFiltro || undefined,
      q: q.trim() || undefined,
      per_page: 40,
    }),
    [estado, sedeFiltro, q],
  )

  const { data, isLoading, isError } = useEntregas(params)
  const entregas = data?.data || []

  function refrescar() {
    queryClient.invalidateQueries({ queryKey: ['entregas'] })
    queryClient.invalidateQueries({ queryKey: ['entregas-resumen'] })
    queryClient.invalidateQueries({ queryKey: ['inventario'] })
    queryClient.invalidateQueries({ queryKey: ['inventario-completo'] })
  }

  async function confirmarCancelar() {
    if (!cancelar) return
    setCancelando(true)
    setError(null)
    try {
      await entregasApi.cancelar(cancelar.id)
      setCancelar(null)
      refrescar()
    } catch (err) {
      setError(err?.error || err?.message || 'No se pudo cancelar el domicilio.')
    } finally {
      setCancelando(false)
    }
  }

  return (
    <div className="animate-fade-up mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Domicilios por facturar
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Entregas contra entrega: el stock sale de la sede y la factura se genera cuando el
            cliente decide qué se queda.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNuevoAbierto(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo domicilio
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3">
        <div className="flex rounded-xl border border-line bg-surface-2/50 p-1">
          {[
            { id: 'pendiente', label: 'Pendientes' },
            { id: 'facturada', label: 'Facturadas' },
            { id: 'todas', label: 'Todas' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setEstado(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                estado === t.id ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select
          value={sedeFiltro}
          onChange={(e) => setSedeFiltro(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-metal focus:outline-none"
        >
          <option value="">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>

        <div className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/60" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente, teléfono o número DOM…"
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-line bg-surface-2" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cargar los domicilios.
        </div>
      ) : entregas.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line py-20 text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-ink-2/50">
            <TruckIcon className="h-7 w-7" />
          </span>
          <p className="text-sm font-medium text-ink">
            {estado === 'pendiente' ? 'No hay domicilios pendientes' : 'No hay domicilios aquí'}
          </p>
          <p className="mt-1 max-w-sm text-xs text-ink-2/70">
            {estado === 'pendiente'
              ? 'Cuando envías una entrega contra entrega desde el POS, aparece aquí hasta que se facture.'
              : 'Prueba con otro filtro o cambia el estado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entregas.map((e) => (
            <article
              key={e.id}
              className="rounded-2xl border border-line bg-white p-4 transition-shadow hover:shadow-[0_10px_30px_-18px_rgba(10,10,10,0.35)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-semibold text-ink">{e.numero}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        ESTADO_BADGE[e.estado] || ESTADO_BADGE.cancelada
                      }`}
                    >
                      {e.estado}
                    </span>
                    {e.estado === 'pendiente' && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colorDias(e.dias)}`}
                      >
                        {e.dias === 0 ? 'Hoy' : `${e.dias} día${e.dias === 1 ? '' : 's'}`}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <UserIcon className="h-4 w-4 text-ink-2/60" />
                      {e.cliente?.nombre || '—'}
                    </span>
                    {(e.telefono || e.cliente?.telefono) && (
                      <a
                        href={`https://wa.me/57${String(e.telefono || e.cliente.telefono).replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-700 underline-offset-2 hover:underline"
                      >
                        {e.telefono || e.cliente.telefono} · WhatsApp
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-ink-2">
                      <StoreIcon className="h-3.5 w-3.5" /> {e.sede}
                    </span>
                    <span className="text-xs text-ink-2">Vendió: {e.empleado?.nombre}</span>
                  </p>
                  <p className="mt-1 text-xs text-ink-2">
                    Entrega: {fechaCorta(e.fecha_entrega)}
                    {e.factura ? ` · Factura ${e.factura}` : ''}
                  </p>
                  {e.direccion && (
                    <p className="mt-0.5 text-xs text-ink-2/80">Dirección: {e.direccion}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">
                      {e.estado === 'facturada' ? 'Facturado' : 'A cobrar'}
                    </p>
                    <p className="text-lg font-bold text-ink">
                      {formato(e.estado === 'facturada' ? e.total_facturado : e.total)}
                    </p>
                  </div>
                </div>
              </div>

              <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                {e.items?.map((it) => (
                  <li
                    key={it.id}
                    className="rounded-lg bg-surface-2/70 px-2 py-1 text-xs text-ink-2"
                    title={it.sede_origen ? `Sale de ${it.sede_origen}` : undefined}
                  >
                    {it.cantidad}× {it.nombre}
                    {it.talla ? ` · ${normalizarTallaVisible(it.talla)}` : ''}
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-ink-2/70">
                  {e.estado === 'facturada'
                    ? `${e.unidades_facturadas} de ${e.unidades} unidad${e.unidades === 1 ? '' : 'es'} facturadas`
                    : `${e.unidades} unidad${e.unidades === 1 ? '' : 'es'}`}
                  {e.nota ? ` · ${e.nota}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => imprimirComprobanteEntrega(e)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2"
                  >
                    <PrinterIcon className="h-3.5 w-3.5" />
                    Comprobante
                  </button>
                  {e.estado === 'pendiente' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCancelar(e)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => setFacturarId(e.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-metal-2 active:scale-[0.98]"
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                        Facturar lo que se llevó
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {nuevoAbierto && (
        <NuevoDomicilioModal
          sedes={sedes}
          empleados={empleados}
          onClose={() => setNuevoAbierto(false)}
          onDone={() => {
            setNuevoAbierto(false)
            refrescar()
          }}
        />
      )}

      {facturarId && (
        <FacturarModal
          entregaId={facturarId}
          empleados={empleados}
          onClose={() => setFacturarId(null)}
          onDone={() => {
            setFacturarId(null)
            refrescar()
          }}
        />
      )}

      {cancelar && (
        <Modal className="animate-fade-in z-[60] flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <AlertIcon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg font-semibold text-ink">Cancelar {cancelar.numero}</h3>
            </div>
            <p className="text-sm text-ink-2">
              Las {cancelar.unidades} unidad(es) vuelven al stock de su sede de origen. Esta acción
              no se puede deshacer.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelar(null)}
                disabled={cancelando}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmarCancelar}
                disabled={cancelando}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Crear domicilio desde cero (la vía rápida es el botón del POS).
// ---------------------------------------------------------------------------
function NuevoDomicilioModal({ sedes, empleados, onClose, onDone }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    cliente_nombre: '',
    telefono: '',
    direccion: '',
    sede_id: '',
    empleado_id: '',
    fecha_entrega: ahoraLocal(),
    nota: '',
  })
  const [busqueda, setBusqueda] = useState('')
  const [cart, setCart] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const { data: variantes = [], isLoading } = useInventarioSede(form.sede_id)

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    const lista = term
      ? variantes.filter(
          (v) =>
            v.nombre.toLowerCase().includes(term) ||
            (v.talla || '').toLowerCase().includes(term) ||
            String(v.codigo_barras || '').toLowerCase().includes(term),
        )
      : variantes
    return lista.slice(0, 30)
  }, [variantes, busqueda])

  const total = cart.reduce((s, i) => s + i.precio * i.cantidad, 0)

  function agregar(v) {
    setCart((prev) => {
      const ex = prev.find((i) => i.variante_id === v.variante_id)
      if (ex) {
        if (ex.cantidad >= v.stock) return prev
        return prev.map((i) =>
          i.variante_id === v.variante_id ? { ...i, cantidad: i.cantidad + 1 } : i,
        )
      }
      return [...prev, { ...v, cantidad: 1 }]
    })
  }

  function cambiarCantidad(varianteId, cantidad) {
    setCart((prev) =>
      prev.map((i) =>
        i.variante_id === varianteId
          ? { ...i, cantidad: Math.max(1, Math.min(i.stock, cantidad)) }
          : i,
      ),
    )
  }

  function cambiarSede(valor) {
    setForm((prev) => ({ ...prev, sede_id: valor }))
    setCart([])
    setBusqueda('')
  }

  async function guardar(e) {
    e.preventDefault()
    setError(null)

    if (!form.cliente_nombre.trim()) {
      setError('Escribe el nombre del cliente.')
      return
    }
    if (!form.sede_id) {
      setError('Selecciona la sede que despacha.')
      return
    }
    if (!form.empleado_id) {
      setError('Selecciona el vendedor.')
      return
    }
    if (!cart.length) {
      setError('Agrega al menos un producto.')
      return
    }

    setGuardando(true)
    try {
      const creada = await entregasApi.create({
        cliente_nombre: form.cliente_nombre.trim(),
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        sede_id: Number(form.sede_id),
        empleado_id: Number(form.empleado_id),
        fecha_entrega: form.fecha_entrega || null,
        nota: form.nota.trim() || null,
        items: cart.map((i) => ({
          variante_id: i.variante_id,
          sede_origen_id: Number(form.sede_id),
          cantidad: i.cantidad,
          precio_final: i.precio,
        })),
      })
      queryClient.invalidateQueries({ queryKey: ['inventario', String(form.sede_id)] })
      imprimirComprobanteEntrega(creada)
      onDone()
    } catch (err) {
      setError(err?.error || err?.message || 'No se pudo crear el domicilio.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal className="animate-fade-in z-[60] flex items-center justify-center overflow-y-auto bg-dark/70 p-4">
      <div className="animate-scale-in flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
              Nuevo domicilio contra entrega
            </h3>
            <p className="text-xs text-ink-2/70">
              Solo el nombre es obligatorio. El stock sale de la sede al guardar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 hover:bg-surface-2 hover:text-ink"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <p className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertIcon className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                Nombre del cliente *
              </span>
              <input
                className={inputCls}
                value={form.cliente_nombre}
                onChange={(e) => setForm((p) => ({ ...p, cliente_nombre: e.target.value }))}
                placeholder="Ej. Laura Gómez"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                Teléfono <span className="normal-case text-ink-2/60">(opcional)</span>
              </span>
              <input
                className={inputCls}
                value={form.telefono}
                onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                placeholder="300 000 0000"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                Dirección <span className="normal-case text-ink-2/60">(opcional)</span>
              </span>
              <input
                className={inputCls}
                value={form.direccion}
                onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
                placeholder="Ej. Calle 80 # 45-12, barrio…"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                Sede que despacha *
              </span>
              <select
                className={inputCls}
                value={form.sede_id}
                onChange={(e) => cambiarSede(e.target.value)}
              >
                <option value="">Selecciona…</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                Vendedor *
              </span>
              <select
                className={inputCls}
                value={form.empleado_id}
                onChange={(e) => setForm((p) => ({ ...p, empleado_id: e.target.value }))}
              >
                <option value="">Selecciona…</option>
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.rol === 'administrador' ? `${emp.nombre} Administrador` : emp.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                Fecha de entrega
              </span>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.fecha_entrega}
                onChange={(e) => setForm((p) => ({ ...p, fecha_entrega: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                Nota <span className="normal-case text-ink-2/60">(opcional)</span>
              </span>
              <input
                className={inputCls}
                value={form.nota}
                onChange={(e) => setForm((p) => ({ ...p, nota: e.target.value }))}
                placeholder="Ej. prueba talla 40 y 41"
              />
            </label>
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-sm font-semibold text-ink">Productos que se lleva</p>
            {!form.sede_id ? (
              <p className="rounded-lg bg-surface-2 px-3 py-4 text-center text-xs text-ink-2">
                Selecciona la sede para ver sus productos.
              </p>
            ) : (
              <>
                <div className="relative mb-2">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/60" />
                  <input
                    className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm focus:border-metal focus:outline-none"
                    placeholder="Buscar producto por nombre, talla o código…"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                  {isLoading ? (
                    <p className="text-xs text-ink-2">Cargando inventario…</p>
                  ) : filtradas.length === 0 ? (
                    <p className="text-xs text-ink-2">Sin productos con stock en esta sede.</p>
                  ) : (
                    filtradas.map((v) => (
                      <button
                        key={v.variante_id}
                        type="button"
                        onClick={() => agregar(v)}
                        className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-left text-xs transition-colors hover:border-metal hover:bg-surface-2/50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{v.nombre}</span>
                          <span className="text-ink-2">
                            {v.talla ? `Talla ${normalizarTallaVisible(v.talla)} · ` : ''}
                            {formato(v.precio)} · stock {v.stock}
                          </span>
                        </span>
                        <PlusIcon className="h-4 w-4 shrink-0 text-ink-2" />
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {cart.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-line pt-3">
                {cart.map((i) => (
                  <li key={i.variante_id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {i.nombre}
                      {i.talla ? <span className="text-ink-2"> · {normalizarTallaVisible(i.talla)}</span> : null}
                    </span>
                    <div className="flex items-center rounded-lg border border-line">
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(i.variante_id, i.cantidad - 1)}
                        className="flex h-7 w-7 items-center justify-center text-ink-2 hover:text-ink"
                      >
                        <MinusIcon className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-xs font-semibold">{i.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(i.variante_id, i.cantidad + 1)}
                        disabled={i.cantidad >= i.stock}
                        className="flex h-7 w-7 items-center justify-center text-ink-2 hover:text-ink disabled:opacity-30"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="w-24 text-right font-semibold text-ink">
                      {formato(i.precio * i.cantidad)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCart((prev) => prev.filter((x) => x.variante_id !== i.variante_id))}
                      className="text-ink-2/50 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-line px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">Total a cobrar</p>
            <p className="text-xl font-bold text-ink">{formato(total)}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-metal-2 disabled:opacity-50"
            >
              <TruckIcon className="h-4 w-4" />
              {guardando ? 'Guardando…' : 'Crear e imprimir'}
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Facturar lo que el cliente se llevó.
// ---------------------------------------------------------------------------
function FacturarModal({ entregaId, empleados, onClose, onDone }) {
  const { data: entrega, isLoading, isError } = useEntregaDetalle(entregaId)

  if (isLoading || isError || !entrega) {
    return (
      <Modal className="animate-fade-in z-[60] flex items-center justify-center overflow-y-auto bg-dark/70 p-4">
        <div className="animate-scale-in w-full max-w-lg rounded-2xl bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                Facturar domicilio
              </h3>
              <p className="text-xs text-ink-2/70">Cargando los productos de la entrega…</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 hover:bg-surface-2 hover:text-ink"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="py-10 text-center text-sm text-ink-2">
            {isLoading ? 'Cargando…' : 'No se pudo cargar el domicilio.'}
          </p>
        </div>
      </Modal>
    )
  }

  // El formulario se monta solo cuando ya llegó el domicilio: así el total y
  // los pagos se inicializan de una vez, sin efectos ni parpadeos.
  return (
    <FacturarForm
      entrega={entrega}
      empleados={empleados}
      onClose={onClose}
      onDone={onDone}
    />
  )
}

function FacturarForm({ entrega, empleados, onClose, onDone }) {
  const queryClient = useQueryClient()
  const items = entrega.items || []
  const totalInicial = items.reduce(
    (s, i) => s + Number(i.precio_unitario) * Number(i.cantidad),
    0,
  )

  const [cantidades, setCantidades] = useState(() =>
    Object.fromEntries(items.map((i) => [i.id, Number(i.cantidad)])),
  )
  const [pagos, setPagos] = useState([
    { metodo_pago: 'efectivo', monto: totalInicial },
  ])
  const [empleadoId, setEmpleadoId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)

  // Por defecto se factura todo lo entregado; el cajero baja a 0 lo devuelto.
  function cantidadDe(item) {
    return item.id in cantidades ? cantidades[item.id] : Number(item.cantidad)
  }

  const total = items.reduce(
    (s, i) => s + Number(i.precio_unitario) * cantidadDe(i),
    0,
  )

  function cambiarCantidad(item, valor) {
    const n = Math.max(0, Math.min(Number(item.cantidad), Number(valor) || 0))
    const nuevas = { ...cantidades, [item.id]: n }
    setCantidades(nuevas)

    const nuevoTotal = items.reduce(
      (s, i) => s + Number(i.precio_unitario) * (i.id in nuevas ? nuevas[i.id] : i.cantidad),
      0,
    )
    // Si solo hay un método de pago, se ajusta al nuevo total.
    setPagos((prev) =>
      prev.length === 1 ? [{ ...prev[0], monto: nuevoTotal }] : prev,
    )
  }

  function togglePago(metodo) {
    setPagos((prev) => {
      const existe = prev.some((p) => p.metodo_pago === metodo)
      if (existe) return prev.filter((p) => p.metodo_pago !== metodo)
      return [...prev, { metodo_pago: metodo, monto: prev.length === 0 ? total : '' }]
    })
  }

  function cambiarMonto(metodo, monto) {
    setPagos((prev) => prev.map((p) => (p.metodo_pago === metodo ? { ...p, monto } : p)))
  }

  const sumaPagos = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0)
  const cuadra = total > 0 && sumaPagos === total

  async function confirmar() {
    if (!cuadra) return
    setGuardando(true)
    setError(null)
    try {
      const res = await entregasApi.facturar(entrega.id, {
        empleado_id: empleadoId ? Number(empleadoId) : null,
        items: items.map((i) => ({ id: i.id, cantidad_facturada: cantidadDe(i) })),
        pagos: pagos.map((p) => ({ metodo_pago: p.metodo_pago, monto: Number(p.monto) || 0 })),
      })
      setResultado(res)
      queryClient.invalidateQueries({ queryKey: ['entregas'] })
      queryClient.invalidateQueries({ queryKey: ['entregas-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-completo'] })
      queryClient.invalidateQueries({ queryKey: ['ventas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      setError(err?.error || err?.message || 'No se pudo facturar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal className="animate-fade-in z-[60] flex items-center justify-center overflow-y-auto bg-dark/70 p-4">
      <div className="animate-scale-in flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
              {resultado ? 'Domicilio facturado' : `Facturar ${entrega.numero}`}
            </h3>
            <p className="text-xs text-ink-2/70">
              {resultado
                ? `Factura ${resultado.factura || '—'} generada.`
                : 'Marca cuántas se quedó el cliente. Lo demás vuelve al stock.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 hover:bg-surface-2 hover:text-ink"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {resultado ? (
            <div className="py-6 text-center">
              <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckIcon className="h-8 w-8" />
              </span>
              <p className="font-semibold text-ink">
                Se facturó {formato(resultado.venta?.total ?? resultado.total)} a{' '}
                {resultado.cliente?.nombre || '—'}
              </p>
              <p className="mt-1 text-sm text-ink-2">
                Factura {resultado.factura || '—'} · {resultado.numero}
              </p>
              <p className="mt-2 text-xs text-ink-2/70">
                Lo devuelto ya volvió al inventario de su sede.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <p className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertIcon className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <p className="mb-2 text-sm font-semibold text-ink">
                {entrega.cliente?.nombre || '—'}
                {entrega.telefono || entrega.cliente?.telefono ? (
                  <span className="ml-2 text-xs font-normal text-ink-2">
                    {entrega.telefono || entrega.cliente.telefono}
                  </span>
                ) : null}
              </p>

              <ul className="space-y-3">
                {items.map((item) => {
                  const cant = cantidadDe(item)
                  const devuelve = Number(item.cantidad) - cant
                  return (
                    <li key={item.id} className="rounded-xl border border-line p-3">
                      <div className="flex items-start gap-2">
                        {item.imagen_url ? (
                          <img
                            src={item.imagen_url}
                            alt={item.nombre}
                            className="h-12 w-12 shrink-0 rounded-lg bg-surface-2 object-cover"
                          />
                        ) : (
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2/50">
                            <TruckIcon className="h-5 w-5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">
                            {item.nombre}
                            {item.talla ? (
                              <span className="text-ink-2">
                                {' '}
                                · {normalizarTallaVisible(item.talla)}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-ink-2">
                            Entregadas: {item.cantidad} · {formato(item.precio_unitario)} c/u
                            {item.sede_origen ? ` · sale de ${item.sede_origen}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-ink">
                          {formato(item.precio_unitario * cant)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                        <label className="flex items-center gap-2 text-xs text-ink-2">
                          Se lleva
                          <div className="flex items-center rounded-lg border border-line">
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(item, cant - 1)}
                              disabled={cant <= 0}
                              className="flex h-7 w-7 items-center justify-center text-ink-2 hover:text-ink disabled:opacity-30"
                            >
                              <MinusIcon className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              value={cant}
                              min={0}
                              max={item.cantidad}
                              onChange={(e) => cambiarCantidad(item, e.target.value)}
                              className="w-9 border-x border-line py-0.5 text-center text-xs font-semibold focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(item, cant + 1)}
                              disabled={cant >= item.cantidad}
                              className="flex h-7 w-7 items-center justify-center text-ink-2 hover:text-ink disabled:opacity-30"
                            >
                              <PlusIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </label>
                        {devuelve > 0 && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                            Devuelve {devuelve} al stock
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-4 border-t border-line pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">Forma(s) de pago</p>
                  <span className={`text-xs font-semibold ${cuadra ? 'text-emerald-700' : 'text-red-700'}`}>
                    {cuadra
                      ? 'Pago completo'
                      : total - sumaPagos !== 0
                        ? total - sumaPagos > 0
                          ? `Falta ${formato(total - sumaPagos)}`
                          : `Excede ${formato(sumaPagos - total)}`
                        : 'Selecciona el pago'}
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
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
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
                          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-right text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                    ¿Quién factura?{' '}
                    <span className="normal-case text-ink-2/60">(opcional)</span>
                  </span>
                  <select
                    value={empleadoId}
                    onChange={(e) => setEmpleadoId(e.target.value)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-metal focus:outline-none"
                  >
                    <option value="">El vendedor de la entrega ({entrega.empleado?.nombre})</option>
                    {empleados.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.rol === 'administrador' ? `${emp.nombre} Administrador` : emp.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-line px-6 py-4">
          {resultado ? (
            <button
              type="button"
              onClick={onDone}
              className="ml-auto rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-metal-2"
            >
              Listo
            </button>
          ) : (
            <>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-2">
                  Total a facturar
                </p>
                <p className="text-2xl font-bold text-ink">{formato(total)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={guardando}
                  className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={!cuadra || guardando}
                  className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-metal-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckIcon className="h-4 w-4" />
                  {guardando ? 'Facturando…' : 'Generar factura'}
                </button>
              </div>
            </>
          )}
        </footer>
      </div>
    </Modal>
  )
}

