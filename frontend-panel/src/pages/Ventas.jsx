import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useSedes, useEmpleados, useVentas, useCalendarioVentas } from '../hooks/useData'
import { ventasApi } from '../services/api'
import PeriodFilter from '../components/PeriodFilter'
import CalendarioVentas from '../components/CalendarioVentas'
import ResumenDiaVentas from '../components/ResumenDiaVentas'
import Modal from '../components/Modal'
import { AlertIcon, CalendarIcon, CheckIcon, ChevronDownIcon, EditIcon, PlusIcon, StoreIcon, TrashIcon, UserIcon, XIcon } from '../components/icons'
import ProductImage from '../components/ProductImage'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const selectCls =
  'select-field w-full rounded-lg border border-line bg-white px-3 py-2 pr-9 text-sm text-ink transition-colors focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const fechaLarga = (iso) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// Sedes de origen de las prendas de una venta. Puede haber más de una cuando
// la factura mezcla productos de sedes distintas.
function origenesVenta(v) {
  const set = new Set()
  for (const it of v.items || []) {
    const sede = it.sede_origen || v.sede_venta
    if (sede) set.add(sede)
  }
  return [...set]
}

const esMultiSede = (v) => origenesVenta(v).length > 1

const claveItem = (it) => it.variante_id ?? `${it.nombre}|${it.talla ?? ''}`

const nombreItem = (it) => `${it.nombre}${it.talla ? ` (${it.talla})` : ''}`

// Estado final de la venta después de devoluciones/cambios: lo que el cliente
// realmente se llevó.
function itemsFinales(v) {
  const mapa = new Map()

  for (const it of v.items || []) {
    const k = claveItem(it)
    const prev = mapa.get(k)
    mapa.set(k, {
      ...it,
      cantidad: (prev?.cantidad || 0) + Number(it.cantidad || 0),
      es_cambio: false,
    })
  }

  const devoluciones = [...(v.devoluciones || [])].sort(
    (a, b) =>
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime() ||
      Number(a.id) - Number(b.id),
  )

  for (const d of devoluciones) {
    for (const it of d.items || []) {
      const k = claveItem(it)
      const prev = mapa.get(k)

      if (it.tipo === 'devuelto') {
        const cantidad = Math.max(0, (prev?.cantidad || 0) - Number(it.cantidad || 0))
        if (cantidad > 0) mapa.set(k, { ...prev, cantidad })
        else mapa.delete(k)
      } else if (it.tipo === 'cambio') {
        mapa.set(k, {
          ...(prev || {}),
          ...it,
          cantidad: (prev?.cantidad || 0) + Number(it.cantidad || 0),
          es_cambio: true,
          // La prenda nueva sale de la sede del cambio.
          sede_origen: it.sede_origen || d.sede_cambio || null,
        })
      }
    }
  }

  return [...mapa.values()].filter((it) => it.cantidad > 0)
}

function totalFinalVenta(v) {
  return itemsFinales(v).reduce(
    (s, it) => s + (Number(it.precio_unitario) || 0) * Number(it.cantidad || 0),
    0,
  )
}

// Prendas del último movimiento: lo último que se llevó el cliente en un cambio.
function ultimaPrenda(v) {
  const devoluciones = [...(v.devoluciones || [])].sort(
    (a, b) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime() ||
      Number(b.id) - Number(a.id),
  )
  const ultima = devoluciones[0]
  if (!ultima || ultima.tipo !== 'cambio') return []
  return (ultima.items || []).filter((it) => it.tipo === 'cambio')
}

function resumenUltima(v) {
  const ultima = ultimaPrenda(v)
  const lista = ultima.length ? ultima : itemsFinales(v)
  return lista.map(nombreItem).join(', ') || '—'
}

const pad2 = (n) => String(n).padStart(2, '0')

const hoyLocalISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const mesLocalISO = () => hoyLocalISO().slice(0, 7)

// Fecha YYYY-MM-DD sin desfase de zona horaria.
const fechaLargaDia = (iso) => {
  const [anio, mes, dia] = String(iso).split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'presencial', label: 'Punto físico' },
  { value: 'virtual', label: 'Redes' },
  { value: 'plan_separe', label: 'Plan separe' },
]

const METODO_LABEL = {
  efectivo: 'Efectivo',
  banco: 'Banco',
  transferencia: 'Transferencia',
  addi: 'Addi',
  sistecredito: 'Sistecredito',
  bold: 'Bold',
  wompi: 'Wompi',
}

const FORMAS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'banco', label: 'Banco' },
  { value: 'addi', label: 'Addi' },
  { value: 'sistecredito', label: 'Sistecredito' },
  { value: 'bold', label: 'Bold' },
]

// Los abonos del Plan Separe solo usan estos dos métodos.
const METODOS_ABONO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
]

export default function Ventas() {
  const { data: sedes = [] } = useSedes()
  const { data: empleados = [] } = useEmpleados()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [periodo, setPeriodo] = useState('mes')
  const [sedeId, setSedeId] = useState('')
  const [empleadoId, setEmpleadoId] = useState('')
  const [tipo, setTipo] = useState('')
  const [page, setPage] = useState(1)
  const [abiertaId, setAbiertaId] = useState(null)
  const [fecha, setFecha] = useState('')
  const [mesCalendario, setMesCalendario] = useState(mesLocalISO)

  // Edición de precios y pagos: solo para el usuario autorizado.
  const puedeEditar = String(user?.email || '').toLowerCase() === 'juan@pragamedellin.com'
  const [editando, setEditando] = useState(null)
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [errorEdit, setErrorEdit] = useState(null)

  // Reversión completa de una venta (solo Juan).
  const [revirtiendo, setRevirtiendo] = useState(null)
  const [revirtiendoProc, setRevirtiendoProc] = useState(false)
  const [errorRevertir, setErrorRevertir] = useState(null)
  const [aviso, setAviso] = useState(null)

  // Corrección de un abono de Plan Separe (solo Juan).
  const [editandoAbono, setEditandoAbono] = useState(null)
  const [guardandoAbono, setGuardandoAbono] = useState(false)
  const [errorAbono, setErrorAbono] = useState(null)

  // Solo ventas de punto físico o redes, sin devoluciones ni pedidos online.
  const puedeRevertir = (v) =>
    puedeEditar &&
    v.tipo !== 'plan_separe' &&
    !v.online &&
    !v.tiene_devoluciones

  const cols = 'grid-cols-[6.5rem_1fr_9rem_1fr_8rem_5.5rem_7.5rem_2rem]'

  const params = useMemo(
    () => ({
      periodo,
      fecha: fecha || undefined,
      sede_id: sedeId || undefined,
      empleado_id: empleadoId || undefined,
      tipo: tipo || undefined,
      page,
      per_page: 10,
    }),
    [periodo, fecha, sedeId, empleadoId, tipo, page],
  )

  const paramsCalendario = useMemo(
    () => ({
      mes: mesCalendario,
      fecha: fecha || undefined,
      sede_id: sedeId || undefined,
      empleado_id: empleadoId || undefined,
      tipo: tipo || undefined,
    }),
    [mesCalendario, fecha, sedeId, empleadoId, tipo],
  )

  const {
    data,
    isLoading: loading,
    isPlaceholderData: actualizandoTabla,
    isError,
    error: errorRaw,
  } = useVentas(params)
  const {
    data: calendario,
    isLoading: cargandoCalendario,
    isPlaceholderData: calendarioEsPlaceholder,
    isError: errorCalendario,
    refetch: recargarCalendario,
  } = useCalendarioVentas(paramsCalendario)

  // Evita mostrar datos de otro mes/día mientras React Query conserva la
  // respuesta anterior (placeholderData) durante un cambio de filtro.
  const calendarioDelMes = calendario?.mes === mesCalendario ? calendario : null
  const resumenCalendario = fecha
    ? calendario?.fecha === fecha
      ? calendario?.resumen_dia
      : null
    : calendarioDelMes?.resumen_mes || null
  const cargandoResumen =
    cargandoCalendario ||
    calendarioEsPlaceholder ||
    (!calendarioDelMes && !errorCalendario)

  const error = errorRaw?.message || (isError ? 'Error cargando las ventas' : null)

  function cambiarPeriodo(p) {
    setPeriodo(p)
    setFecha('')
    setPage(1)
  }

  function seleccionarDia(iso) {
    setFecha(iso)
    setMesCalendario(iso.slice(0, 7))
    setPage(1)
  }

  function irAHoy() {
    const iso = hoyLocalISO()
    setFecha(iso)
    setMesCalendario(iso.slice(0, 7))
    setPage(1)
  }

  function verMes() {
    setFecha('')
    setPage(1)
  }

  function cambiarMesCalendario(mes) {
    setMesCalendario(mes)
    if (fecha && fecha.slice(0, 7) !== mes) {
      setFecha('')
      setPage(1)
    }
  }

  function cambiarSede(e) {
    setSedeId(e.target.value)
    setPage(1)
  }

  function cambiarEmpleado(e) {
    setEmpleadoId(e.target.value)
    setPage(1)
  }

  function cambiarTipo(e) {
    setTipo(e.target.value)
    setPage(1)
  }

  function irA(pagina) {
    setPage(pagina)
  }

  function abrirEdicion(v) {
    setErrorEdit(null)
    setEditando({
      venta: v,
      tipo: v.tipo || 'presencial',
      items: (v.items || []).map((it) => ({
        detalle_id: it.detalle_id,
        variante_id: it.variante_id,
        nombre: it.nombre,
        talla: it.talla,
        es_relampago: it.es_relampago,
        nota: it.nota,
        cantidad: it.cantidad,
        precio_final: it.precio_final ?? it.precio_unitario,
      })),
      pagos: (v.pagos || []).map((p) => ({ metodo_pago: p.metodo_pago, monto: p.monto })),
    })
  }

  const totalEdit = editando
    ? editando.items.reduce((s, it) => s + (Number(it.precio_final) || 0) * it.cantidad, 0)
    : 0
  const sumaPagosEdit = editando
    ? editando.pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0)
    : 0

  function cambiarPrecioItem(idx, valor) {
    setEditando((prev) =>
      prev
        ? { ...prev, items: prev.items.map((it, i) => (i === idx ? { ...it, precio_final: valor } : it)) }
        : prev,
    )
  }

  function cambiarPago(idx, clave, valor) {
    setEditando((prev) =>
      prev
        ? { ...prev, pagos: prev.pagos.map((p, i) => (i === idx ? { ...p, [clave]: valor } : p)) }
        : prev,
    )
  }

  function agregarPago() {
    setEditando((prev) =>
      prev ? { ...prev, pagos: [...prev.pagos, { metodo_pago: 'efectivo', monto: '' }] } : prev,
    )
  }

  function quitarPago(idx) {
    setEditando((prev) => (prev ? { ...prev, pagos: prev.pagos.filter((_, i) => i !== idx) } : prev))
  }

  async function guardarEdicion() {
    if (!editando) return
    if (editando.pagos.length === 0) {
      setErrorEdit('Agrega al menos un pago.')
      return
    }
    if (sumaPagosEdit !== totalEdit) {
      setErrorEdit('Los pagos deben sumar exactamente el total de la venta.')
      return
    }
    setGuardandoEdit(true)
    setErrorEdit(null)
    try {
      await ventasApi.update(editando.venta.id, {
        tipo: editando.tipo,
        items: editando.items.map((it) => ({
          detalle_id: it.detalle_id,
          variante_id: it.variante_id,
          precio_final: Number(it.precio_final),
        })),
        pagos: editando.pagos.map((p) => ({
          metodo_pago: p.metodo_pago,
          monto: Number(p.monto),
        })),
      })
      await queryClient.invalidateQueries({ queryKey: ['ventas'] })
      setEditando(null)
    } catch (err) {
      setErrorEdit(err?.error || err?.message || 'No se pudo editar la venta')
    } finally {
      setGuardandoEdit(false)
    }
  }

  function abrirReversion(venta) {
    setErrorRevertir(null)
    setRevirtiendo(venta)
  }

  async function confirmarReversion() {
    if (!revirtiendo || revirtiendoProc) return

    setRevirtiendoProc(true)
    setErrorRevertir(null)

    try {
      const resultado = await ventasApi.revertir(revirtiendo.id)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ventas'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['comisiones'] }),
        queryClient.invalidateQueries({ queryKey: ['inventario'] }),
        queryClient.invalidateQueries({ queryKey: ['inventario-completo'] }),
        queryClient.invalidateQueries({ queryKey: ['productos'] }),
        queryClient.invalidateQueries({ queryKey: ['dueno-resumen'] }),
      ])

      setAbiertaId(null)
      setRevirtiendo(null)
      const etiqueta = resultado.factura ? `Venta ${resultado.factura}` : 'Venta'
      setAviso(
        `${etiqueta} revertida. ${resultado.unidades_devueltas} unidades devueltas al inventario.`,
      )
      window.setTimeout(() => setAviso(null), 5000)
    } catch (err) {
      setErrorRevertir(err?.error || err?.message || 'No se pudo revertir la venta')
    } finally {
      setRevirtiendoProc(false)
    }
  }

  function abrirEdicionAbono(v) {
    setErrorAbono(null)
    setEditandoAbono({
      venta: v,
      monto: v.total,
      metodo_pago: v.pagos?.[0]?.metodo_pago || 'efectivo',
      empleado_id: v.empleado_id,
    })
  }

  async function guardarAbono() {
    if (!editandoAbono || guardandoAbono) return

    const monto = Number(editandoAbono.monto)
    if (!Number.isFinite(monto) || monto <= 0) {
      setErrorAbono('Escribe un monto mayor a cero.')
      return
    }

    setGuardandoAbono(true)
    setErrorAbono(null)

    try {
      const resultado = await ventasApi.updateAbono(editandoAbono.venta.id, {
        monto,
        metodo_pago: editandoAbono.metodo_pago,
        empleado_id: Number(editandoAbono.empleado_id),
      })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ventas'] }),
        queryClient.invalidateQueries({ queryKey: ['apartados'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['comisiones'] }),
        queryClient.invalidateQueries({ queryKey: ['dueno-resumen'] }),
      ])

      setEditandoAbono(null)
      setAviso(
        `Abono corregido. Total abonado del plan: ${formato(resultado.apartado.abonado)}.`,
      )
      window.setTimeout(() => setAviso(null), 5000)
    } catch (err) {
      setErrorAbono(err?.error || err?.message || 'No se pudo editar el abono')
    } finally {
      setGuardandoAbono(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-up mx-auto max-w-6xl">
        <div className="mb-6 h-8 w-72 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-10 w-full animate-pulse rounded-xl border border-line bg-surface-2" />
        <div className="mt-4 h-96 animate-pulse rounded-2xl border border-line bg-surface-2" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="animate-fade-in flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </div>
    )
  }

  const { data: filas, meta, resumen } = data
  const empleadoSel = empleados.find((e) => String(e.id) === String(empleadoId))

  return (
    <div className="animate-fade-up mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            {fecha ? 'Ventas del día' : 'Historial de ventas'}
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            {fecha ? (
              <>
                {fechaLargaDia(fecha)}
                {actualizandoTabla ? (
                  <> · <span className="animate-pulse">Actualizando…</span></>
                ) : (
                  <>
                    {' '}· {meta.total} {meta.total === 1 ? 'venta' : 'ventas'} ·{' '}
                    {formato(resumen.totalVendido)}
                  </>
                )}
              </>
            ) : actualizandoTabla ? (
              <>Actualizando ventas del periodo…</>
            ) : (
              <>
                {meta.total} ventas · {formato(resumen.totalVendido)} en el periodo
                filtrado.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {fecha && (
            <span className="inline-flex items-center gap-2 rounded-full border border-ink bg-ink px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              <CalendarIcon className="h-3.5 w-3.5" />
              {fechaLargaDia(fecha)}
              <button
                type="button"
                onClick={verMes}
                aria-label="Quitar fecha"
                className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          <PeriodFilter value={periodo} onChange={cambiarPeriodo} />
        </div>
      </div>

      <div className="mb-5">
        <CalendarioVentas
          mes={mesCalendario}
          fecha={fecha}
          dias={calendarioDelMes?.dias || []}
          resumenMes={calendarioDelMes?.resumen_mes}
          cargando={cargandoResumen}
          onMesChange={cambiarMesCalendario}
          onSeleccionar={seleccionarDia}
          onHoy={irAHoy}
          onMes={verMes}
        />
        {errorCalendario && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertIcon className="h-4 w-4 shrink-0" />
            <p className="flex-1">No se pudo cargar el calendario de ventas.</p>
            <button
              type="button"
              onClick={() => recargarCalendario()}
              className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:border-red-500"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      {!errorCalendario && (
        <div className="mb-5">
          <ResumenDiaVentas
            resumen={resumenCalendario}
            esMes={!fecha}
            cargando={cargandoResumen}
          />
        </div>
      )}

      {aviso && (
        <div className="animate-fade-in mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckIcon className="h-5 w-5 shrink-0" />
          {aviso}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <StoreIcon className="h-4 w-4" /> Sede de venta
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
            {TIPOS.map((t) => (
              <option key={t.value || 'all'} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <div className="hidden items-end sm:flex">
          <span className="text-sm text-ink-2">
            Mostrando página {meta.current_page} de {meta.last_page}.
          </span>
        </div>
      </div>

      {/* Tabla */}
      {filas.length === 0 ? (
        <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
          Sin ventas para los filtros seleccionados.
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white">
          {/* Cabecera (solo pantallas ≥md) */}
          <div
            className={`hidden md:grid ${cols} items-center gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2`}
          >
            <span>Factura</span>
            <span>Fecha</span>
            <span>Vendedor</span>
            <span>Sede de venta</span>
            <span className="text-center">Pago</span>
            <span className="text-center">Tipo</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          <ul className="divide-y divide-line">
            {filas.map((v) => {
              const abierta = abiertaId === v.id
              const ultima = v.tiene_devoluciones ? resumenUltima(v) : ''
              const itemsMostrar = v.tiene_devoluciones ? itemsFinales(v) : v.items
              const totalFinal = v.tiene_devoluciones ? totalFinalVenta(v) : null
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setAbiertaId(abierta ? null : v.id)}
                    className={`w-full text-left text-sm transition-colors hover:bg-surface-2/50 ${
                      abierta ? 'bg-surface-2/40' : ''
                    }`}
                  >
                    {/* Fila desktop */}
                    <div className={`hidden md:grid ${cols} items-center gap-4 px-5 py-3`}>
                      <span className="font-medium text-ink">{v.factura || '—'}</span>
                      <span className="text-ink">{fechaLarga(v.fecha)}</span>
                      <span className="truncate text-ink">{v.empleado.nombre}</span>
                      <span className="min-w-0 text-ink-2">
                        <span className="block truncate">{v.sede_venta}</span>
                        {v.tiene_devoluciones && ultima !== '—' && (
                          <span
                            className="block truncate text-[10px] font-semibold text-emerald-700"
                            title={`Última prenda: ${ultima}`}
                          >
                            Última: {ultima}
                          </span>
                        )}
                        {esMultiSede(v) && (
                          <span
                            className="block truncate text-[10px] font-semibold text-amber-700"
                            title={`Sale de: ${origenesVenta(v).join(', ')}`}
                          >
                            Sale de: {origenesVenta(v).join(' + ')}
                          </span>
                        )}
                      </span>
                      <span className="flex flex-wrap justify-center gap-1">
                        {(v.pagos || []).map((p) => (
                          <span
                            key={p.metodo_pago}
                            className="inline-flex rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-medium capitalize text-ink-2"
                          >
                            {METODO_LABEL[p.metodo_pago] || p.metodo_pago}
                          </span>
                        ))}
                      </span>
                      <span className="flex flex-col items-center gap-1 justify-self-center">
                        <span className="inline-flex rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium capitalize text-ink-2">
                          {v.tipo}
                        </span>
                        {v.tiene_devoluciones && (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            Devolución
                          </span>
                        )}
                      </span>
                      <span className="text-right">
                        <span className="font-semibold text-ink">{formato(v.total)}</span>
                        {totalFinal != null && totalFinal !== v.total && (
                          <span className="block text-[10px] font-semibold text-emerald-700">
                            Final {formato(totalFinal)}
                          </span>
                        )}
                        {v.descuento_total > 0 && (
                          <span className="block text-[10px] font-medium text-emerald-700">
                            Dcto −{formato(v.descuento_total)}
                          </span>
                        )}
                      </span>
                      <span className="justify-self-end">
                        <ChevronDownIcon
                          className={`h-4 w-4 text-ink-2/70 transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`}
                        />
                      </span>
                    </div>

                    {/* Fila móvil */}
                    <div className="flex items-center gap-3 px-4 py-3 md:hidden">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-ink">
                            {v.factura || '—'}
                          </span>
                          <div className="shrink-0 text-right">
                            <span className="font-bold text-ink">{formato(v.total)}</span>
                            {totalFinal != null && totalFinal !== v.total && (
                              <span className="block text-[10px] font-semibold text-emerald-700">
                                Final {formato(totalFinal)}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-2">{fechaLarga(v.fecha)}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
                          <span className="truncate">{v.empleado.nombre}</span>
                          <span className="text-ink-2/40">·</span>
                          <span className="truncate">{v.sede_venta}</span>
                          <span className="inline-flex shrink-0 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-medium capitalize">
                            {v.tipo}
                          </span>
                          {v.tiene_devoluciones && (
                            <span className="inline-flex shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                              Devolución
                            </span>
                          )}
                          {esMultiSede(v) && (
                            <span
                              className="inline-flex shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                              title={`Sale de: ${origenesVenta(v).join(', ')}`}
                            >
                              Multi-sede
                            </span>
                          )}
                        </p>
                        {v.tiene_devoluciones && ultima !== '—' && (
                          <p className="mt-1 truncate text-[11px] font-semibold text-emerald-700">
                            Última: {ultima}
                          </p>
                        )}
                      </div>
                      <ChevronDownIcon
                        className={`h-4 w-4 shrink-0 text-ink-2/70 transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {abierta && (
                    <div className="animate-fade-in border-t border-line bg-surface-2/40 px-4 py-4 md:px-5">
                      {v.plan_separe ? (
                        <div className="space-y-3">
                          {/* Para quién */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-semibold text-ink">
                              Plan separe · {v.plan_separe.numero_interno}
                            </span>
                            <span className="text-xs text-ink-2">
                              Cliente:{' '}
                              <span className="font-medium text-ink">{v.plan_separe.cliente.nombre}</span>
                              {v.plan_separe.cliente.telefono ? ` · ${v.plan_separe.cliente.telefono}` : ''}
                            </span>
                          </div>

                          {puedeEditar && (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => abrirEdicionAbono(v)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink"
                              >
                                <EditIcon className="h-3.5 w-3.5" />
                                Editar abono
                              </button>
                            </div>
                          )}

                          {/* Qué se apartó */}
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                            Productos apartados ({v.plan_separe.items.length})
                          </p>
                          <ul className="space-y-2">
                            {v.plan_separe.items.map((it, idx) => (
                              <li
                                key={`${it.variante_id}-${idx}`}
                                className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5"
                              >
                                <ProductImage
                                  src={it.imagen_url}
                                  alt={it.nombre}
                                  className="h-14 w-14 rounded-lg md:h-16 md:w-16"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-ink">{it.nombre}</p>
                                  <p className="text-xs text-ink-2">
                                    {it.talla ? `Talla ${it.talla} · ` : ''}
                                    {it.cantidad} × {formato(it.precio_unitario)}
                                  </p>
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-ink">
                                  {formato(it.subtotal)}
                                </span>
                              </li>
                            ))}
                          </ul>

                          {/* Montos */}
                          <div className="grid grid-cols-2 gap-3 rounded-xl bg-white px-4 py-3 text-sm sm:grid-cols-4">
                            <div>
                              <p className="text-xs text-ink-2">Total del plan</p>
                              <p className="font-semibold text-ink">{formato(v.plan_separe.total)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-ink-2">Total abonado</p>
                              <p className="font-semibold text-emerald-700">
                                {formato(v.plan_separe.abonado)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-ink-2">Saldo pendiente</p>
                              <p className="font-semibold text-ink">{formato(v.plan_separe.saldo)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-ink-2">Este abono</p>
                              <p className="font-bold text-ink">{formato(v.total)}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {puedeEditar && (
                            <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                              {v.tipo !== 'plan_separe' && !v.online && v.tiene_devoluciones && (
                                <span className="text-xs text-ink-2">
                                  Tiene devoluciones registradas; no se puede revertir.
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => abrirEdicion(v)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink"
                              >
                                <EditIcon className="h-3.5 w-3.5" />
                                Editar precios y pagos
                              </button>
                              {puedeRevertir(v) && (
                                <button
                                  type="button"
                                  onClick={() => abrirReversion(v)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-50"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                  Revertir venta
                                </button>
                              )}
                            </div>
                          )}
                          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
                            {v.tiene_devoluciones
                              ? 'Productos que se llevó finalmente'
                              : 'Resumen de la venta'}
                            <span className="inline-flex rounded-full border border-line bg-white px-2 py-0.5 font-medium normal-case text-ink-2">
                              {itemsMostrar.length}{' '}
                              {itemsMostrar.length === 1 ? 'artículo' : 'artículos'}
                            </span>
                          </p>
                          <ul className="space-y-2">
                            {itemsMostrar.map((it, idx) => (
                              <li
                                key={`${it.detalle_id ?? it.variante_id ?? 'x'}-${idx}`}
                                className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5"
                              >
                                <ProductImage
                                  src={it.imagen_url}
                                  alt={it.nombre}
                                  className="h-14 w-14 rounded-lg md:h-16 md:w-16"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                                    <span className="truncate">{it.nombre}</span>
                                    {it.es_relampago && (
                                      <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                        Relámpago
                                      </span>
                                    )}
                                    {it.es_cambio && (
                                      <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                                        Cambio
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-ink-2">
                                    {it.talla ? `Talla ${it.talla} · ` : ''}
                                    {it.cantidad} × {formato(it.precio_unitario)}
                                  </p>
                                  {!it.es_relampago && (
                                    <p
                                      className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                        it.sede_origen && it.sede_origen !== v.sede_venta
                                          ? 'bg-amber-50 text-amber-800'
                                          : 'bg-surface-2 text-ink-2'
                                      }`}
                                    >
                                      <StoreIcon className="h-3 w-3" />
                                      Sale de: {it.sede_origen || v.sede_venta}
                                    </p>
                                  )}
                                  {it.es_relampago && it.nota && (
                                    <p className="text-[11px] text-ink-2/70">{it.nota}</p>
                                  )}
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-ink">
                                  {formato(it.subtotal)}
                                </span>
                              </li>
                            ))}
                          </ul>
                                                    {(v.devoluciones || []).length > 0 && (
                            <div className="mt-3 space-y-2">
                              {v.devoluciones.map((d) => (
                                <div
                                  key={d.id}
                                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-ink-2"
                                >
                                  <span className="font-semibold text-amber-800">
                                    {d.tipo === 'reembolso'
                                      ? 'Devolución de dinero'
                                      : 'Devolución / cambio'}{' '}
                                    · {d.numero_interno}
                                  </span>
                                  <span>{fechaLarga(d.fecha)}</span>
                                  <span>Vendedor: {d.empleado}</span>
                                  {d.tipo === 'cambio' && d.diferencia > 0 && (
                                    <span>
                                      Diferencia: <b className="text-ink">{formato(d.diferencia)}</b>
                                      {d.metodo_pago
                                        ? ` · ${METODO_LABEL[d.metodo_pago] || d.metodo_pago}`
                                        : ''}
                                      {d.monto_pagado != null
                                        ? ` · Recibido ${formato(d.monto_pagado)}`
                                        : ''}
                                      {d.vuelto > 0 ? ` · Vuelto ${formato(d.vuelto)}` : ''}
                                    </span>
                                  )}
                                  {d.tipo === 'reembolso' && (
                                    <span>
                                      Dinero entregado:{' '}
                                      <b className="text-red-700">{formato(d.total_devuelto)}</b>
                                      {d.metodo_pago
                                        ? ` · ${METODO_LABEL[d.metodo_pago] || d.metodo_pago}`
                                        : ''}
                                    </span>
                                  )}
                                  {d.sede_cambio && d.sede_cambio !== v.sede_venta && (
                                    <span>
                                      Nuevo producto salió de:{' '}
                                      <b className="text-ink">{d.sede_cambio}</b>
                                    </span>
                                  )}
                                  {d.motivo && <span>Motivo: {d.motivo}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white px-4 py-3">
                            {v.descuento_total > 0 && (
                              <span className="text-xs text-emerald-700">
                                Descuento −{formato(v.descuento_total)}
                              </span>
                            )}
                            <span className="text-right">
                              <span className="block text-xs text-ink-2">
                                {v.tiene_devoluciones ? 'Total de lo que se llevó' : 'Total pagado'}
                              </span>
                              <span className="text-lg font-bold text-ink">
                                {formato(v.tiene_devoluciones ? totalFinal : v.total)}
                              </span>
                              {v.tiene_devoluciones && totalFinal !== v.total && (
                                <span className="block text-[10px] text-ink-2">
                                  Venta original: {formato(v.total)}
                                </span>
                              )}
                            </span>
                          </div>
                          {v.nota && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                              <span className="font-semibold">Nota: </span>
                              {v.nota}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Paginación */}
      {meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-ink-2">
            Mostrando {filas.length} de {meta.total} ventas
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

      {/* Total vendido del filtro aplicado */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Total vendido</p>
          <p className="mt-0.5 text-sm text-ink-2">
            {empleadoSel ? `${empleadoSel.nombre} · ` : ''}
            {meta.total} {meta.total === 1 ? 'venta' : 'ventas'} en el periodo
          </p>
        </div>
        <p className="text-2xl font-bold text-ink">{formato(resumen.totalVendido)}</p>
      </div>

      {/* Modal: editar precios y pagos de una venta */}
      {editando && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                Editar venta {editando.venta.factura}
              </h3>
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {errorEdit && (
              <p className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertIcon className="h-4 w-4 shrink-0" /> {errorEdit}
              </p>
            )}

            <div className="mb-4">
              <label
                htmlFor="tipo-venta"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2"
              >
                Tipo de venta
              </label>
              <select
                id="tipo-venta"
                value={editando.tipo}
                onChange={(e) => setEditando((prev) => (prev ? { ...prev, tipo: e.target.value } : prev))}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
              >
                <option value="presencial">Punto físico</option>
                <option value="virtual">Redes</option>
              </select>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
              Productos (precio unitario)
            </p>
            <div className="space-y-2">
              {editando.items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {it.nombre}
                    {it.talla ? <span className="text-ink-2"> · {it.talla}</span> : null}
                    <span className="text-ink-2"> × {it.cantidad}</span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={it.precio_final}
                    onChange={(e) => cambiarPrecioItem(idx, e.target.value)}
                    className="w-32 shrink-0 rounded-lg border border-line bg-white px-3 py-2 text-right text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                  />
                </div>
              ))}
            </div>

            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">Pagos</p>
            <div className="space-y-2">
              {editando.pagos.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={p.metodo_pago}
                    onChange={(e) => cambiarPago(idx, 'metodo_pago', e.target.value)}
                    className="w-32 shrink-0 rounded-lg border border-line bg-white px-2 py-2 text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                  >
                    {FORMAS_PAGO.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={p.monto}
                    onChange={(e) => cambiarPago(idx, 'monto', e.target.value)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-right text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                  />
                  <button
                    type="button"
                    onClick={() => quitarPago(idx)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-2/60 transition-colors hover:bg-red-50 hover:text-red-700"
                    title="Quitar pago"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={agregarPago}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink-2 transition-colors hover:text-ink"
            >
              <PlusIcon className="h-4 w-4" /> Agregar pago
            </button>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span className="text-ink-2">Total</span>
              <span className="font-bold text-ink">{formato(totalEdit)}</span>
            </div>
            <p className={`mt-1 text-xs font-medium ${sumaPagosEdit === totalEdit ? 'text-emerald-700' : 'text-red-700'}`}>
              {sumaPagosEdit === totalEdit
                ? 'Pagos completos'
                : `Pagos ${formato(sumaPagosEdit)} · ${sumaPagosEdit > totalEdit ? 'excede' : 'falta'} ${formato(Math.abs(totalEdit - sumaPagosEdit))}`}
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(null)}
                disabled={guardandoEdit}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarEdicion}
                disabled={guardandoEdit}
                className="flex-1 rounded-lg bg-ink py-2.5 text-sm font-medium text-white hover:bg-metal-2 disabled:opacity-40"
              >
                {guardandoEdit ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: corregir un abono de Plan Separe */}
      {editandoAbono && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                  Editar abono
                </h3>
                <p className="mt-0.5 text-xs text-ink-2">
                  {editandoAbono.venta.plan_separe.numero_interno} ·{' '}
                  {editandoAbono.venta.plan_separe.cliente.nombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !guardandoAbono && setEditandoAbono(null)}
                disabled={guardandoAbono}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-2/70 hover:bg-surface-2 hover:text-ink disabled:opacity-40"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-sm">
              <div>
                <p className="text-[11px] text-ink-2">Total plan</p>
                <p className="font-semibold text-ink">
                  {formato(editandoAbono.venta.plan_separe.total)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink-2">Abonado</p>
                <p className="font-semibold text-ink">
                  {formato(editandoAbono.venta.plan_separe.abonado)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink-2">Este abono</p>
                <p className="font-semibold text-ink">{formato(editandoAbono.venta.total)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Monto del abono
                </span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(
                    1,
                    editandoAbono.venta.plan_separe.total -
                      (editandoAbono.venta.plan_separe.abonado - editandoAbono.venta.total),
                  )}
                  value={editandoAbono.monto}
                  onChange={(e) =>
                    setEditandoAbono((prev) =>
                      prev ? { ...prev, monto: e.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-right text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Método del abono
                </span>
                <select
                  value={editandoAbono.metodo_pago}
                  onChange={(e) =>
                    setEditandoAbono((prev) =>
                      prev ? { ...prev, metodo_pago: e.target.value } : prev,
                    )
                  }
                  className={selectCls}
                >
                  {METODOS_ABONO.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Vendedor
                </span>
                <select
                  value={editandoAbono.empleado_id}
                  onChange={(e) =>
                    setEditandoAbono((prev) =>
                      prev ? { ...prev, empleado_id: e.target.value } : prev,
                    )
                  }
                  className={selectCls}
                >
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Al guardar se recalculan el total abonado del plan, los ingresos y las comisiones.
            </p>

            {errorAbono && (
              <p className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertIcon className="h-4 w-4 shrink-0" /> {errorAbono}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditandoAbono(null)}
                disabled={guardandoAbono}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarAbono}
                disabled={guardandoAbono}
                className="flex-1 rounded-lg bg-ink py-2.5 text-sm font-semibold text-white hover:bg-metal-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardandoAbono ? 'Guardando…' : 'Guardar abono'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: revertir venta completa */}
      {revirtiendo && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                  Revertir venta
                </h3>
                <p className="mt-0.5 text-xs text-ink-2">
                  {revirtiendo.factura || 'Sin factura'} · {fechaLarga(revirtiendo.fecha)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !revirtiendoProc && setRevirtiendo(null)}
                disabled={revirtiendoProc}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-2/70 hover:bg-surface-2 hover:text-ink disabled:opacity-40"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-surface-2 p-3 text-sm">
              <div>
                <p className="text-xs text-ink-2">Sede</p>
                <p className="font-semibold text-ink">{revirtiendo.sede_venta || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-2">Vendedor</p>
                <p className="font-semibold text-ink">{revirtiendo.empleado?.nombre || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-2">Artículos</p>
                <p className="font-semibold text-ink">
                  {revirtiendo.items?.length || 0}{' '}
                  {revirtiendo.items?.length === 1 ? 'referencia' : 'referencias'}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-2">Total</p>
                <p className="font-bold text-ink">{formato(revirtiendo.total)}</p>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <p className="font-semibold">Esta acción no se puede deshacer.</p>
              <p className="mt-1">
                Se devolverá el stock a <b>{revirtiendo.sede_venta}</b> y se eliminarán la
                venta, la factura y los pagos.
              </p>
              <p className="mt-1">
                Si el pago fue con Addi, Sistecredito o Bold, gestiona también la reversión
                con la pasarela.
              </p>
            </div>

            {errorRevertir && (
              <p className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertIcon className="h-4 w-4 shrink-0" /> {errorRevertir}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRevirtiendo(null)}
                disabled={revirtiendoProc}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarReversion}
                disabled={revirtiendoProc}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {revirtiendoProc ? 'Revirtiendo…' : 'Sí, revertir venta'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}