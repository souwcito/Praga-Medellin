import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apartadosApi } from '../services/api'
import {
  useApartados,
  useClientes,
  useEmpleados,
  useInventarioSede,
  useSedes,
} from '../hooks/useData'
import Modal from '../components/Modal'
import ProductImage from '../components/ProductImage'
import { buscarVariantePorCodigo, coincideCodigoEtiqueta, coincideCodigoExacto } from '../utils/codigoEtiqueta'
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  EditIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  StoreIcon,
  TrashIcon,
  UserIcon,
  XIcon,
} from '../components/icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fechaLarga = (iso) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const selectCls =
  'select-field w-full rounded-lg border border-line bg-white px-3 py-2 pr-9 text-sm text-ink transition-colors focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'
const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const ABONO_METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
]

const ESTADOS = {
  activo: { label: 'Activo', cls: 'border-sky-200 bg-sky-50 text-sky-700' },
  completado: { label: 'Completado', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  cancelado: { label: 'Cancelado', cls: 'border-red-200 bg-red-50 text-red-600' },
}

function ChipEstado({ estado }) {
  const e = ESTADOS[estado] || ESTADOS.activo
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${e.cls}`}>
      {e.label}
    </span>
  )
}

function BarraProgreso({ pct }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          pct >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-ink via-ink to-metal-2'
        }`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

const msgError = (err) => err?.error || err?.message || 'No se pudo completar la operación'

// ---------------------------------------------------------------------------
// Resumen detallado de un plan separe / de un abono: para quién, qué se apartó
// y los montos. Se muestra al crear el plan y al registrar cada abono.
// ---------------------------------------------------------------------------

function ResumenPlan({ plan, titulo, onClose }) {
  if (!plan) return null
  const abono = [...(plan.abonos || [])].pop()
  const metodo = abono
    ? ABONO_METODOS.find((m) => m.value === abono.metodo_pago)?.label || abono.metodo_pago
    : null
  const completado = plan.estado === 'completado'

  return (
    <Modal className="animate-fade-in z-50 flex items-center justify-center overflow-y-auto bg-dark/70 p-4">
      <div className="animate-scale-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
              completado ? 'bg-emerald-500' : 'bg-ink'
            }`}
          >
            <CheckIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold tracking-tight text-ink">{titulo}</h3>
            <p className="text-xs text-ink-2">
              {plan.numero_interno} · {fechaLarga(plan.fecha)}
            </p>
          </div>
        </div>

        {/* Para quién */}
        <div className="mb-4 rounded-xl border border-line bg-surface-2/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">Cliente</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{plan.cliente?.nombre}</p>
          <p className="text-xs text-ink-2">{plan.cliente?.telefono || 'Sin celular'}</p>
        </div>

        {/* Dónde y quién atendió */}
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">Sede</p>
            <p className="font-medium text-ink">{plan.sede}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">Vendedor</p>
            <p className="font-medium text-ink">{plan.empleado?.nombre}</p>
          </div>
        </div>

        {/* Qué se apartó */}
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
          Productos apartados ({plan.items?.length || 0})
        </p>
        <ul className="mb-4 space-y-2">
          {(plan.items || []).map((it, idx) => (
            <li
              key={`${it.variante_id}-${idx}`}
              className="flex items-center gap-3 rounded-lg border border-line p-2"
            >
              <ProductImage src={it.imagen_url} alt={it.nombre} className="h-12 w-12 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{it.nombre}</p>
                <p className="text-xs text-ink-2">
                  {it.talla ? `Talla ${it.talla} · ` : ''}
                  {it.cantidad} × {formato(it.precio_unitario)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-ink">{formato(it.subtotal)}</span>
            </li>
          ))}
        </ul>

        {/* Montos */}
        <div className="rounded-xl border border-line bg-surface-2/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-2">Total del plan</span>
            <span className="font-semibold text-ink">{formato(plan.total)}</span>
          </div>
          {abono && (
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-ink-2">{completado ? 'Último abono' : 'Abono registrado'}</span>
              <span className="font-semibold text-emerald-700">
                {formato(abono.monto)}
                {metodo ? ` · ${metodo}` : ''}
              </span>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-ink-2">Total abonado</span>
            <span className="font-semibold text-ink">{formato(plan.abonado)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-ink-2">Saldo pendiente</span>
            <span className="font-semibold text-ink">{formato(plan.saldo)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-ink-2">Progreso</span>
            <span className="font-bold text-ink">{plan.porcentaje}%</span>
          </div>
          <div className="mt-1.5">
            <BarraProgreso pct={plan.porcentaje} />
          </div>
          {completado && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              ¡Plan completado! El cliente ya pagó todo.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-colors hover:bg-metal-2"
        >
          {completado ? 'Cerrar' : 'Entendido'}
        </button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Modal: modificar un plan separe activo (productos y cantidades)
// ---------------------------------------------------------------------------

function EditarPlanModal({ planId, sedeId, onClose, onGuardado }) {
  const queryClient = useQueryClient()
  const { data: variantes = [], isLoading: cargandoInventario } = useInventarioSede(
    String(sedeId || ''),
  )

  const [plan, setPlan] = useState(null)
  const [items, setItems] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true
    setCargando(true)
    setError(null)

    apartadosApi
      .detalle(planId)
      .then((data) => {
        if (!activo) return
        setPlan(data)
        // Agrupa por variante por si el plan tiene filas repetidas.
        const mapa = new Map()
        ;(data.items || []).forEach((it) => {
          const varianteId = Number(it.variante_id)
          const existente = mapa.get(varianteId)
          if (existente) {
            existente.cantidad += Number(it.cantidad || 0)
          } else {
            mapa.set(varianteId, {
              variante_id: varianteId,
              nombre: it.nombre,
              talla: it.talla,
              imagen_url: it.imagen_url,
              precio: Number(it.precio_unitario || 0),
              cantidad: Number(it.cantidad || 1),
            })
          }
        })
        setItems([...mapa.values()])
      })
      .catch((err) => {
        if (activo) setError(msgError(err))
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [planId])

  // Cantidad original del plan por variante (lo que ya está reservado).
  const originales = useMemo(() => {
    const mapa = new Map()
    ;(plan?.items || []).forEach((it) => {
      const id = Number(it.variante_id)
      mapa.set(id, (mapa.get(id) || 0) + Number(it.cantidad || 0))
    })
    return mapa
  }, [plan])

  // Máximo que se puede pedir: lo ya reservado + el stock libre de la sede.
  const maximoDe = (varianteId) => {
    const inventario = variantes.find(
      (v) => Number(v.variante_id) === Number(varianteId),
    )
    return Number(inventario?.stock || 0) + Number(originales.get(Number(varianteId)) || 0)
  }

  const variantesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return variantes.slice(0, 30)

    const exactas = variantes.filter((v) => coincideCodigoExacto(v, q))
    if (exactas.length) return exactas

    return variantes.filter(
      (v) =>
        v.nombre.toLowerCase().includes(q) ||
        coincideCodigoEtiqueta(v, q) ||
        (v.talla || '').toLowerCase().includes(q),
    )
  }, [variantes, busqueda])

  const total = useMemo(
    () => items.reduce((suma, item) => suma + item.precio * item.cantidad, 0),
    [items],
  )
  const abonado = Number(plan?.abonado || 0)
  const saldo = total - abonado
  const puedeGuardar = items.length > 0 && saldo >= 0 && !guardando

  function agregar(variante) {
    setItems((prev) => {
      const existente = prev.find(
        (item) => Number(item.variante_id) === Number(variante.variante_id),
      )
      if (existente) {
        if (existente.cantidad >= maximoDe(variante.variante_id)) return prev
        return prev.map((item) =>
          Number(item.variante_id) === Number(variante.variante_id)
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        )
      }
      return [
        ...prev,
        {
          variante_id: variante.variante_id,
          nombre: variante.nombre,
          talla: variante.talla,
          imagen_url: variante.imagen_url,
          precio: Number(variante.precio || 0),
          cantidad: 1,
        },
      ]
    })
  }

  function cambiarCantidad(varianteId, cantidad) {
    setItems((prev) =>
      prev.map((item) => {
        if (Number(item.variante_id) !== Number(varianteId)) return item
        const max = maximoDe(varianteId)
        return {
          ...item,
          cantidad: Math.max(1, Math.min(max, Number(cantidad) || 1)),
        }
      }),
    )
  }

  function quitar(varianteId) {
    setItems((prev) =>
      prev.filter((item) => Number(item.variante_id) !== Number(varianteId)),
    )
  }

  function escanear(e) {
    if (e.key !== 'Enter') return
    const encontrada = buscarVariantePorCodigo(variantes, e.currentTarget.value)
    if (!encontrada) return
    e.preventDefault()
    agregar(encontrada)
    setBusqueda('')
  }

  async function guardar() {
    if (!puedeGuardar) return
    setGuardando(true)
    setError(null)
    try {
      const result = await apartadosApi.actualizar(planId, {
        items: items.map((item) => ({
          variante_id: item.variante_id,
          cantidad: item.cantidad,
        })),
      })
      queryClient.invalidateQueries({ queryKey: ['apartados'] })
      queryClient.invalidateQueries({ queryKey: ['inventario', String(sedeId)] })
      queryClient.invalidateQueries({ queryKey: ['inventario-completo'] })
      onGuardado?.(result)
    } catch (err) {
      setError(msgError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal className="animate-fade-in z-50 flex items-center justify-center overflow-y-auto bg-dark/70 p-4">
      <div className="animate-scale-in flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
              Modificar plan separe
            </h3>
            <p className="mt-0.5 text-xs text-ink-2">
              {plan
                ? `${plan.numero_interno} · ${plan.cliente?.nombre || 'Cliente'} · ${plan.sede}`
                : 'Cargando plan…'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {cargando ? (
            <div className="grid h-40 place-items-center text-sm text-ink-2/70">
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
                Cargando plan…
              </span>
            </div>
          ) : !plan ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertIcon className="h-4 w-4 shrink-0" />
              {error || 'No se pudo cargar el plan.'}
            </div>
          ) : (
            <div className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Productos del plan
                </p>
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-2/70">
                    El plan no tiene productos. Agrega al menos uno.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {items.map((item) => {
                      const max = maximoDe(item.variante_id)
                      return (
                        <li
                          key={item.variante_id}
                          className="flex items-center gap-3 rounded-xl border border-line p-2.5"
                        >
                          <ProductImage
                            src={item.imagen_url}
                            alt={item.nombre}
                            className="h-11 w-11 rounded-lg"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                              {item.nombre}
                            </p>
                            <p className="text-xs text-ink-2">
                              {item.talla ? `Talla ${item.talla} · ` : ''}
                              {formato(item.precio)} · disponible {max}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <div className="flex items-center rounded-lg border border-line">
                              <button
                                type="button"
                                onClick={() =>
                                  cambiarCantidad(item.variante_id, item.cantidad - 1)
                                }
                                className="flex h-7 w-7 items-center justify-center text-ink-2 hover:text-ink active:scale-90"
                              >
                                <MinusIcon className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-7 text-center text-sm font-semibold text-ink">
                                {item.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  cambiarCantidad(item.variante_id, item.cantidad + 1)
                                }
                                disabled={item.cantidad >= max}
                                className="flex h-7 w-7 items-center justify-center text-ink-2 hover:text-ink active:scale-90 disabled:opacity-30"
                              >
                                <PlusIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => quitar(item.variante_id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-2/40 transition-colors hover:bg-red-50 hover:text-red-700"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Agregar producto
                </p>
                <div className="relative mb-3">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/60" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={escanear}
                    placeholder="Buscar por nombre, talla o código…"
                    className={`${inputCls} pl-9`}
                  />
                </div>

                {cargandoInventario ? (
                  <p className="text-xs text-ink-2/70">Cargando inventario de la sede…</p>
                ) : variantesFiltradas.length === 0 ? (
                  <p className="text-xs text-ink-2/70">
                    No hay productos con stock disponible en esta sede.
                  </p>
                ) : (
                  <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3">
                    {variantesFiltradas.map((variante) => (
                      <button
                        key={variante.variante_id}
                        type="button"
                        onClick={() => agregar(variante)}
                        className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-metal"
                      >
                        <div className="relative aspect-square overflow-hidden bg-surface-2">
                          <ProductImage
                            src={variante.imagen_url}
                            alt={variante.nombre}
                            className="h-full w-full"
                          />
                          {variante.talla && (
                            <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {variante.talla}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col p-2">
                          <p className="line-clamp-2 text-xs font-medium text-ink">
                            {variante.nombre}
                          </p>
                          <p className="mt-1 text-xs font-bold text-ink">
                            {formato(variante.precio)}
                          </p>
                          <p className="text-[10px] text-ink-2/70">
                            stock {variante.stock}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-line bg-surface-2/40 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-2">Nuevo total del plan</span>
                  <span className="text-xl font-bold text-ink">{formato(total)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-ink-2">Abonado</span>
                  <span className="font-semibold text-emerald-700">{formato(abonado)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-ink-2">Saldo pendiente</span>
                  <span className="font-semibold text-ink">{formato(Math.max(0, saldo))}</span>
                </div>
                {saldo < 0 && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    El nuevo total no puede ser menor a lo ya abonado (
                    {formato(abonado)}). Agrega productos o aumenta cantidades.
                  </p>
                )}
                {saldo === 0 && items.length > 0 && (
                  <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    Con este total el plan queda completamente pagado y se marca como completado.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-xs text-ink-2">
            {items.length} {items.length === 1 ? 'producto' : 'productos'} en el plan
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={!puedeGuardar || cargando}
              className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-metal-2 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
            >
              {guardando ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Guardando…
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Vista: Registrar un Plan Separe
// ---------------------------------------------------------------------------

function Registrar({ sedeId, vendedorId, onCreado }) {
  const queryClient = useQueryClient()
  const { data: variantes = [], isLoading: cargando } = useInventarioSede(sedeId)
  const [busqueda, setBusqueda] = useState('')
  const [items, setItems] = useState([])

  const [busquedaCliente, setBusquedaCliente] = useState('')
  const { data: clientes = [] } = useClientes(busquedaCliente.trim())
  const [clienteSel, setClienteSel] = useState(null)
  const [nuevoCliente, setNuevoCliente] = useState(null)

  const [montoAbono, setMontoAbono] = useState('')
  const [metodoAbono, setMetodoAbono] = useState('efectivo')

  const [creando, setCreando] = useState(false)
  const [error, setError] = useState(null)
  const [resumen, setResumen] = useState(null)

  const variantesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return variantes

    const exactas = variantes.filter((v) => coincideCodigoExacto(v, q))
    if (exactas.length) return exactas

    return variantes.filter(
      (v) =>
        v.nombre.toLowerCase().includes(q) ||
        coincideCodigoEtiqueta(v, q) ||
        (v.talla || '').toLowerCase().includes(q),
    )
  }, [variantes, busqueda])

  const total = useMemo(
    () => items.reduce((s, i) => s + i.precio * i.cantidad, 0),
    [items],
  )

  const clienteResuelto = clienteSel || nuevoCliente
  const puedeCrear =
    Boolean(sedeId && vendedorId) &&
    items.length > 0 &&
    Boolean(clienteResuelto?.nombre) &&
    (!nuevoCliente || Boolean(nuevoCliente.telefono?.trim())) &&
    Number(montoAbono) >= 1 &&
    Number(montoAbono) <= total

  function agregar(v) {
    setItems((prev) => {
      const ex = prev.find((i) => i.variante_id === v.variante_id)
      if (ex) {
        if (ex.cantidad >= v.stock) return prev
        return prev.map((i) => (i.variante_id === v.variante_id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      return [...prev, { ...v, cantidad: 1 }]
    })
  }

  // El lector de códigos escribe el código y envía Enter: agrega directo la
  // variante exacta (producto + talla) al plan.
  function escanear(e) {
    if (e.key !== 'Enter') return
    const encontrada = buscarVariantePorCodigo(variantes, e.currentTarget.value)
    if (!encontrada) return
    e.preventDefault()
    agregar(encontrada)
    setBusqueda('')
  }

  function cambiarCantidad(variante_id, cantidad) {
    setItems((prev) =>
      prev
        .map((i) =>
          i.variante_id === variante_id
            ? { ...i, cantidad: Math.max(1, Math.min(i.stock, cantidad)) }
            : i,
        )
        .filter((i) => i.cantidad > 0),
    )
  }

  function quitar(variante_id) {
    setItems((prev) => prev.filter((i) => i.variante_id !== variante_id))
  }

  async function crear() {
    if (!puedeCrear) return
    setCreando(true)
    setError(null)
    try {
      const result = await apartadosApi.create({
        cliente_id: clienteSel?.id || undefined,
        cliente: clienteSel ? undefined : { nombre: nuevoCliente.nombre, telefono: nuevoCliente.telefono },
        sede_id: Number(sedeId),
        empleado_id: Number(vendedorId),
        items: items.map((i) => ({ variante_id: i.variante_id, cantidad: i.cantidad })),
        abono_inicial: { monto: Number(montoAbono), metodo_pago: metodoAbono },
      })
      queryClient.invalidateQueries({ queryKey: ['apartados'] })
      queryClient.invalidateQueries({ queryKey: ['inventario', sedeId] })
      // Muestra el resumen detallado; al cerrarlo pasa al listado.
      setResumen(result)
    } catch (err) {
      setError(msgError(err))
    } finally {
      setCreando(false)
    }
  }

  function cerrarResumen() {
    setResumen(null)
    onCreado()
  }

  return (
    <div>
      {error && (
        <div className="animate-fade-in mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Productos de la sede */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-1 font-display text-lg font-semibold tracking-tight text-ink">
            1 · ¿Qué se aparta?
          </h2>
          <p className="mb-4 text-xs text-ink-2/70">
            {sedeId
              ? 'Elige los productos del stock disponible en la sede. Al crear el plan, estas unidades dejan de estar en venta.'
              : 'Selecciona una sede para ver el stock disponible.'}
          </p>

          {sedeId && (
            <div className="relative mb-3">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/60" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={escanear}
                placeholder="Buscar por nombre, talla o código…"
                className={`${inputCls} pl-9`}
              />
            </div>
          )}

          {!sedeId ? (
            <div className="grid h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-ink-2/70">
              Selecciona una sede.
            </div>
          ) : cargando ? (
            <div className="grid h-40 place-items-center">
              <span className="flex items-center gap-2 text-sm text-ink-2/70">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" /> Cargando
                inventario…
              </span>
            </div>
          ) : (
            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3">
              {variantesFiltradas.map((v) => (
                <button
                  key={v.variante_id}
                  type="button"
                  onClick={() => agregar(v)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-metal"
                >
                  <div className="relative aspect-square overflow-hidden bg-surface-2">
                    <ProductImage src={v.imagen_url} alt={v.nombre} className="h-full w-full" />
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
          )}

          {items.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
                A apartar ({items.length})
              </p>
              <ul className="space-y-2">
                {items.map((i) => (
                  <li key={i.variante_id} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
                    <ProductImage src={i.imagen_url} alt={i.nombre} className="h-11 w-11 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{i.nombre}</p>
                      <p className="text-xs text-ink-2">
                        {i.talla ? `Talla ${i.talla} · ` : ''}
                        {formato(i.precio)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <div className="flex items-center rounded-lg border border-line">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(i.variante_id, i.cantidad - 1)}
                          className="flex h-7 w-7 items-center justify-center text-ink-2 hover:text-ink active:scale-90"
                        >
                          <MinusIcon className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-ink">{i.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(i.variante_id, i.cantidad + 1)}
                          disabled={i.cantidad >= i.stock}
                          className="flex h-7 w-7 items-center justify-center text-ink-2 hover:text-ink active:scale-90 disabled:opacity-30"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitar(i.variante_id)}
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
        </section>

        {/* Cliente + abono */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-1 font-display text-lg font-semibold tracking-tight text-ink">
              2 · ¿Quién lo separa?
            </h2>
            <p className="mb-4 text-xs text-ink-2/70">
              Busca por nombre, o registra un cliente nuevo (nombre y celular).
            </p>

            <div className="relative mb-3">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/60" />
              <input
                type="text"
                value={busquedaCliente}
                onChange={(e) => {
                  setBusquedaCliente(e.target.value)
                  setClienteSel(null)
                  setNuevoCliente(null)
                }}
                placeholder="Buscar por nombre…"
                className={`${inputCls} pl-9`}
              />
            </div>

            {!clienteSel && !nuevoCliente && busquedaCliente.trim() && clientes.length > 0 && (
              <ul className="mb-3 max-h-44 space-y-1 overflow-y-auto">
                {clientes.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setClienteSel(c)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:bg-surface-2/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{c.nombre}</span>
                        <span className="block text-xs text-ink-2">{c.telefono || 'Sin celular'}</span>
                      </span>
                      <CheckIcon className="h-4 w-4 shrink-0 text-ink-2/40" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!clienteSel && !nuevoCliente && busquedaCliente.trim() && clientes.length === 0 && (
              <button
                type="button"
                onClick={() => setNuevoCliente({ nombre: busquedaCliente.trim(), telefono: '' })}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-metal px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-2/60"
              >
                <PlusIcon className="h-4 w-4" /> Registrar «{busquedaCliente.trim()}» como cliente nuevo
              </button>
            )}

            {(clienteSel || nuevoCliente) && (
              <div className="mb-3 rounded-xl border border-line bg-surface-2/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {clienteSel ? clienteSel.nombre : nuevoCliente.nombre}
                    </p>
                    <p className="text-xs text-ink-2">
                      {clienteSel ? (clienteSel.telefono || 'Sin celular') : 'Cliente nuevo'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClienteSel(null)
                      setNuevoCliente(null)
                    }}
                    className="rounded-lg p-1 text-ink-2/50 hover:bg-white hover:text-ink"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                {nuevoCliente && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={nuevoCliente.nombre}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                      placeholder="Nombre completo *"
                      className={inputCls}
                    />
                    <input
                      type="tel"
                      value={nuevoCliente.telefono || ''}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                      placeholder="Número de celular *"
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-1 font-display text-lg font-semibold tracking-tight text-ink">
              3 · Abono inicial
            </h2>
            <p className="mb-4 text-xs text-ink-2/70">
              El cliente abona una parte hoy. Puede ser todo el valor y se completa de una vez.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Valor del abono *
                </span>
                <input
                  type="number"
                  min={1}
                  max={total || undefined}
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Método *
                </span>
                <select
                  value={metodoAbono}
                  onChange={(e) => setMetodoAbono(e.target.value)}
                  className={selectCls}
                >
                  {ABONO_METODOS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {Number(montoAbono) > total && total > 0 && (
              <p className="mt-2 text-xs text-red-700">El abono no puede superar el total.</p>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-surface-2/40 p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-ink-2">Total a pagar</span>
              <span className="text-2xl font-bold text-ink">{formato(total)}</span>
            </div>
            <button
              type="button"
              onClick={crear}
              disabled={!puedeCrear || creando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:bg-metal-2 hover:shadow-lg hover:shadow-ink/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creando ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Creando…
                </span>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5" />
                  Crear plan y separar productos
                </>
              )}
            </button>
            {!puedeCrear && (
              <p className="mt-2 text-center text-xs text-ink-2/70">
                Completa: sede y vendedor · productos · cliente (nombre y celular) · abono inicial (1 – {formato(total)}).
              </p>
            )}
          </section>
        </div>
      </div>

      {resumen && <ResumenPlan plan={resumen} titulo="Plan separe creado" onClose={cerrarResumen} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vista: Mis apartados
// ---------------------------------------------------------------------------

function Listado({ vendedorId, onAbonado }) {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({ estado: estado || undefined, q: q.trim() || undefined, page, per_page: 8 }),
    [estado, q, page],
  )
  const { data, isLoading, isError, error: errorRaw } = useApartados(params)
  const error = errorRaw?.message || (isError ? 'Error cargando los planes' : null)

  const [abonoModal, setAbonoModal] = useState(null) // plan
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('efectivo')
  const [abonando, setAbonando] = useState(false)
  const [abonoError, setAbonoError] = useState(null)

  const [detalle, setDetalle] = useState(null)
  const [resumenAbono, setResumenAbono] = useState(null)
  const [editar, setEditar] = useState(null)
  const [avisoEdicion, setAvisoEdicion] = useState(null)

  const [cancelarId, setCancelarId] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  function abrirAbono(plan) {
    setAbonoModal(plan)
    setMonto(String(plan.saldo))
    setMetodo('efectivo')
    setAbonoError(null)
  }

  async function confirmarAbono() {
    if (!abonoModal || !Number(monto) || Number(monto) <= 0) return
    setAbonando(true)
    setAbonoError(null)
    try {
      const result = await apartadosApi.abonar(abonoModal.id, {
        monto: Number(monto),
        metodo_pago: metodo,
        empleado_id: Number(vendedorId),
      })
      queryClient.invalidateQueries({ queryKey: ['apartados'] })
      setAbonoModal(null)
      setResumenAbono(result)
      onAbonado?.()
    } catch (err) {
      setAbonoError(msgError(err))
    } finally {
      setAbonando(false)
    }
  }

  async function abrirDetalle(id) {
    try {
      const d = await apartadosApi.detalle(id)
      setDetalle(d)
    } catch {
      setDetalle(null)
    }
  }

  async function confirmarCancelar() {
    if (!cancelarId) return
    setCancelando(true)
    setCancelError(null)
    try {
      await apartadosApi.cancelar(cancelarId)
      queryClient.invalidateQueries({ queryKey: ['apartados'] })
      setCancelarId(null)
    } catch (err) {
      setCancelError(msgError(err))
    } finally {
      setCancelando(false)
    }
  }

  return (
    <div>
      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/60" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por cliente o celular…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value)
            setPage(1)
          }}
          className={`${selectCls} w-44`}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="completado">Completados</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      {avisoEdicion && (
        <div className="animate-fade-in mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckIcon className="h-5 w-5 shrink-0" /> {avisoEdicion}
        </div>
      )}

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
        </div>
      ) : !data?.data?.length ? (
        <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
          No hay planes separe registrados.
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {data.data.map((ap) => {
              const ultimoAbono = ap.abonos?.[ap.abonos.length - 1]
              return (
                <li key={ap.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/40 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white">
                        <UserIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {ap.cliente.nombre}
                          {ap.cliente.telefono ? (
                            <span className="font-normal text-ink-2"> · {ap.cliente.telefono}</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-ink-2">
                          {ap.numero_interno} · {fechaLarga(ap.fecha)}{' '}
                          {ap.factura ? `· Factura ${ap.factura}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChipEstado estado={ap.estado} />
                      <span className="text-xs text-ink-2">{ap.sede}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_18rem]">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {(ap.items || []).map((it, idx) => (
                          <div
                            key={`${it.variante_id}-${idx}`}
                            className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/30 py-1 pl-1 pr-2"
                          >
                            <ProductImage src={it.imagen_url} alt={it.nombre} className="h-10 w-10 rounded-md" />
                            <div className="min-w-0">
                              <p className="max-w-44 truncate text-xs font-medium text-ink">{it.nombre}</p>
                              <p className="text-[11px] text-ink-2">
                                {it.talla ? `Talla ${it.talla} · ` : ''}
                                {it.cantidad} × {formato(it.precio_unitario)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {ultimoAbono && ap.estado === 'activo' && (
                        <p className="mt-3 text-xs text-ink-2/70">
                          Último abono: {ABONO_METODOS.find((m) => m.value === ultimoAbono.metodo_pago)?.label || ultimoAbono.metodo_pago} ·{' '}
                          {formato(ultimoAbono.monto)}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-ink-2">
                          Abonado{' '}
                          <span className="font-semibold text-ink">{formato(ap.abonado)}</span> de{' '}
                          <span className="font-semibold text-ink">{formato(ap.total)}</span>
                        </span>
                        <span className="font-bold text-ink">{ap.porcentaje}%</span>
                      </div>
                      <BarraProgreso pct={ap.porcentaje} />
                      {ap.estado === 'activo' && (
                        <p className="mt-1.5 text-xs text-ink-2">
                          Saldo pendiente: <span className="font-semibold text-ink">{formato(ap.saldo)}</span>
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {ap.estado === 'activo' && (
                          <>
                            <button
                              type="button"
                              onClick={() => abrirAbono(ap)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98]"
                            >
                              <PlusIcon className="h-3.5 w-3.5" /> Abonar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditar({ id: ap.id, sedeId: ap.sede_id })}
                              className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-2"
                            >
                              <EditIcon className="h-3.5 w-3.5" /> Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCancelarId(ap.id)
                                setCancelError(null)
                              }}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                            >
                              No se terminó
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => abrirDetalle(ap.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-2"
                        >
                          <ChevronDownIcon className="h-3.5 w-3.5" /> Ver detalle
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {data.meta?.last_page > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-ink-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.meta.current_page <= 1}
                className="rounded-lg border border-line bg-white px-3 py-1.5 font-medium text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span>
                Página {data.meta.current_page} de {data.meta.last_page}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.meta.last_page, p + 1))}
                disabled={data.meta.current_page >= data.meta.last_page}
                className="rounded-lg border border-line bg-white px-3 py-1.5 font-medium text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de edición del plan */}
      {editar && (
        <EditarPlanModal
          planId={editar.id}
          sedeId={editar.sedeId}
          onClose={() => setEditar(null)}
          onGuardado={() => {
            setEditar(null)
            setAvisoEdicion('Plan actualizado: productos, cantidades y stock ajustados.')
            window.setTimeout(() => setAvisoEdicion(null), 5000)
          }}
        />
      )}

      {/* Modal de abono */}
      {abonoModal && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink">Registrar abono</h3>
                <p className="text-xs text-ink-2">
                  {abonoModal.numero_interno} · {abonoModal.cliente.nombre} · saldo{' '}
                  {formato(abonoModal.saldo)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbonoModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {abonoError && (
              <p className="animate-fade-in mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {abonoError}
              </p>
            )}

            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Monto</span>
              <input
                type="number"
                min={1}
                max={abonoModal.saldo}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                autoFocus
                className={inputCls}
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Método del abono</span>
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={selectCls}>
                {ABONO_METODOS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAbonoModal(null)}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAbono}
                disabled={abonando || !Number(monto) || Number(monto) <= 0 || Number(monto) > abonoModal.saldo}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {abonando ? 'Registrando…' : 'Guardar abono'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de detalle */}
      {detalle && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                  {detalle.numero_interno}
                </h3>
                <p className="text-xs text-ink-2">
                  {detalle.cliente.nombre}
                  {detalle.cliente.telefono ? ` · ${detalle.cliente.telefono}` : ''} · {fechaLarga(detalle.fecha)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetalle(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <ChipEstado estado={detalle.estado} />
              {detalle.factura && <span className="text-xs text-ink-2">Factura {detalle.factura}</span>}
            </div>

            <div className="mb-4 space-y-2">
              {(detalle.items || []).map((it, idx) => (
                <div
                  key={`${it.variante_id}-${idx}`}
                  className="flex items-center gap-3 rounded-lg border border-line p-2"
                >
                  <ProductImage src={it.imagen_url} alt={it.nombre} className="h-12 w-12 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{it.nombre}</p>
                    <p className="text-xs text-ink-2">
                      {it.talla ? `Talla ${it.talla} · ` : ''}
                      {it.cantidad} × {formato(it.precio_unitario)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-ink">{formato(it.subtotal)}</span>
                </div>
              ))}
            </div>

            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-2">
              Historial de abonos ({detalle.num_abonos})
            </p>
            {(detalle.abonos || []).length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-2 text-xs text-ink-2/60">Sin abonos.</p>
            ) : (
              <ul className="mb-4 space-y-1.5">
                {detalle.abonos.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">{formato(a.monto)}</span>
                      <span className="block text-xs text-ink-2">
                        {ABONO_METODOS.find((m) => m.value === a.metodo_pago)?.label || a.metodo_pago} ·{' '}
                        {fechaLarga(a.fecha)} · {a.empleado.nombre}
                      </span>
                    </span>
                    <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                  </li>
                ))}
              </ul>
            )}

            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-ink-2">Progreso</span>
              <span className="font-bold text-ink">{detalle.porcentaje}%</span>
            </div>
            <BarraProgreso pct={detalle.porcentaje} />
            <div className="mt-1.5 flex items-center justify-between text-xs text-ink-2">
              <span>Abonado {formato(detalle.abonado)}</span>
              <span>Total {formato(detalle.total)}</span>
            </div>

            <button
              type="button"
              onClick={() => setDetalle(null)}
              className="mt-5 w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-white hover:bg-metal-2"
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal de "no se terminó" (cancelar) */}
      {cancelarId && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
              ¿Marcar como no terminado?
            </h3>
            <p className="mt-2 text-sm text-ink-2">
              Los productos apartados volverán al stock de la sede y estarán disponibles en el POS y en la web
              nuevamente. El historial queda como «Cancelado».
            </p>
            {cancelError && (
              <p className="animate-fade-in mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {cancelError}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelarId(null)}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmarCancelar}
                disabled={cancelando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:opacity-40"
              >
                {cancelando ? 'Cancelando…' : 'Sí, marcar no terminado'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {resumenAbono && (
        <ResumenPlan plan={resumenAbono} titulo="Abono registrado" onClose={() => setResumenAbono(null)} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function PlanSepare() {
  const { data: sedes = [] } = useSedes()
  const { data: empleados = [] } = useEmpleados()
  const [sedeId, setSedeId] = useState('')
  const [vendedorId, setVendedorId] = useState('')
  const [tab, setTab] = useState('registrar')
  const [aviso, setAviso] = useState(null)

  function creado() {
    setTab('listado')
    setAviso('Plan separe creado: se separaron los productos del stock de la sede.')
    window.setTimeout(() => setAviso(null), 5000)
  }

  return (
    <div className="animate-fade-up mx-auto max-w-screen-xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Plan Separe</h1>
          <p className="mt-1 text-sm text-ink-2">
            El cliente aparta productos y los va abonando. Al separar, las unidades dejan de estar en venta;
            si no se termina, vuelven al stock.
          </p>
        </div>
      </div>

      {/* Pestañas */}
      <div className="mb-4 inline-flex rounded-xl border border-line bg-white p-0.5">
        {[
          { id: 'registrar', label: 'Registrar' },
          { id: 'listado', label: 'Mis apartados' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all duration-200 ${
              tab === t.id ? 'bg-ink text-white shadow-sm' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Selectores de sede y vendedor */}
      <div className="mb-5 grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:max-w-xl">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <StoreIcon className="h-4 w-4" /> Sede
          </span>
          <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className={selectCls}>
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
          <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className={selectCls}>
            <option value="">Selecciona un vendedor…</option>
            {empleados.map((v) => (
              <option key={v.id} value={v.id}>
                {v.rol === 'administrador' ? `${v.nombre} Administrador` : v.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {aviso && (
        <div className="animate-fade-in mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckIcon className="h-5 w-5 shrink-0" /> {aviso}
        </div>
      )}

      {tab === 'registrar' ? (
        <Registrar sedeId={sedeId} vendedorId={vendedorId} onCreado={creado} />
      ) : (
        <Listado vendedorId={vendedorId} />
      )}
    </div>
  )
}