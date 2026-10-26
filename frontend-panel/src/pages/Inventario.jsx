import { useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { inventarioApi } from '../services/api'
import { useCategorias, useInventarioCompleto, useSubcategorias } from '../hooks/useData'
import { ordenarTallas } from '../utils/catalogo'
import { coincideCodigoEtiqueta, coincideCodigoExacto } from '../utils/codigoEtiqueta'
import Modal from '../components/Modal'
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from '../components/icons'

const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const selectCls =
  'select-field w-full rounded-lg border border-line bg-white px-3 py-2 pr-9 text-sm text-ink transition-colors focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

// Orden natural de tallas (XS→XXL; numéricas y "Única" al final)
const ORDEN_TALLAS = ['XS', 'XS/S', 'S', 'S/M', 'M', 'M/L', 'L', 'XL', 'XXL', 'XXXL']
function ordenTalla(a, b) {
  const ia = ORDEN_TALLAS.indexOf(a)
  const ib = ORDEN_TALLAS.indexOf(b)
  if (ia !== -1 && ib !== -1) return ia - ib
  if (ia !== -1) return -1
  if (ib !== -1) return 1
  return a.localeCompare(b, undefined, { numeric: true })
}

// Normaliza la talla para mostrarla y filtrarla. Las variantes sin talla
// (talla null) se agrupan como "Unitalla".
function tallaDe(variante) {
  const talla = variante?.talla
  const texto = talla === null || talla === undefined ? '' : String(talla).trim()
  return texto === '' ? 'Unitalla' : texto
}

// Calidades del catálogo (las mismas del formulario de productos).
const ORDEN_CALIDADES = ['Original', 'Turca', '1.1', 'Sin definir']

// La calidad se deduce de la subcategoría ("Buzos Turcos", "Camisetas
// Originales", "Buzos Premium 1.1"). Si el producto no tiene subcategoría,
// se usa el nombre del producto (p. ej. "Jean DSQUARED2 1.1 Premium").
function calidadDe(grupo, subcategorias) {
  const sub = subcategorias.find((s) => s.id === grupo.subcategoria_id)
  const texto = String(sub?.nombre || grupo.nombre || '').toLowerCase()
  if (texto.includes('1.1') || texto.includes('premium')) return '1.1'
  if (texto.includes('turc')) return 'Turca'
  if (texto.includes('original')) return 'Original'
  return 'Sin definir'
}

export default function Inventario() {
  const queryClient = useQueryClient()
  const { data: categorias = [] } = useCategorias()
  const { data: subcategorias = [] } = useSubcategorias()
  const { data: variantes = [], isLoading: loading, isError, error: errorRaw } = useInventarioCompleto()
  const error = errorRaw?.message || (isError ? 'Error cargando el inventario' : null)

  const [busqueda, setBusqueda] = useState('')
  const [catalogoId, setCatalogoId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [tallaId, setTallaId] = useState('')
  const [calidadId, setCalidadId] = useState('')
  const [sedeId, setSedeId] = useState('')
  const [soloBajo, setSoloBajo] = useState(false)
  const [expandido, setExpandido] = useState(null)
  const [categoriaAbierta, setCategoriaAbierta] = useState(null)

  const [aviso, setAviso] = useState(null)

  // Modal de ajuste
  const [modal, setModal] = useState(null) // { variante, sede }
  const [tipo, setTipo] = useState('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [ajustando, setAjustando] = useState(false)
  const [ajusteError, setAjusteError] = useState(null)

  const parentRef = useRef(null)

  // Agrupa las variantes por PRODUCTO: vista general + detalle por variante
  const grupos = useMemo(() => {
    const map = new Map()
    variantes.forEach((v) => {
      let g = map.get(v.producto_id)
      if (!g) {
        g = {
          producto_id: v.producto_id,
          nombre: v.nombre,
          catalogo: v.catalogo,
          categoria_id: v.categoria_id,
          subcategoria_id: v.subcategoria_id,
          sku: v.sku,
          imagen_url: v.imagen_url,
          variantes: [],
        }
        map.set(v.producto_id, g)
      }
      g.variantes.push(v)
    })
    return [...map.values()].map((g) => ({
      ...g,
      calidad: calidadDe(g, subcategorias),
    }))
  }, [variantes, subcategorias])

  const sedes = useMemo(
    () => variantes[0]?.stock.map((s) => ({ sede_id: s.sede_id, sede: s.sede })) || [],
    [variantes],
  )

  const sedeActiva =
    sedeId && sedes.some((s) => s.sede_id === Number(sedeId)) ? sedeId : ''
  const sedesVisibles = sedeActiva
    ? sedes.filter((s) => s.sede_id === Number(sedeActiva))
    : sedes

  // Calidades que existen para el catálogo/categoría seleccionados.
  const calidadesDisponibles = useMemo(() => {
    const set = new Set()
    grupos.forEach((g) => {
      if (catalogoId && g.catalogo !== catalogoId) return
      if (categoriaId && g.categoria_id !== Number(categoriaId)) return
      set.add(g.calidad)
    })
    return ORDEN_CALIDADES.filter((c) => set.has(c))
  }, [grupos, catalogoId, categoriaId])

  const calidadActiva = calidadesDisponibles.includes(calidadId) ? calidadId : ''

  // Tallas que realmente existen para el catálogo/categoría/calidad
  // seleccionados. Se calculan con las variantes del inventario.
  const tallasDisponibles = useMemo(() => {
    const set = new Set()
    grupos.forEach((g) => {
      if (catalogoId && g.catalogo !== catalogoId) return
      if (categoriaId && g.categoria_id !== Number(categoriaId)) return
      if (calidadActiva && g.calidad !== calidadActiva) return
      g.variantes.forEach((v) => set.add(tallaDe(v)))
    })
    return ordenarTallas([...set])
  }, [grupos, catalogoId, categoriaId, calidadActiva])

  // Si la talla guardada ya no existe para el filtro actual, se ignora.
  const tallaActiva = tallasDisponibles.includes(tallaId) ? tallaId : ''

  // Variantes que se tienen en cuenta para totales y detalle. Con una talla
  // seleccionada, todo se calcula solo sobre esa talla.
  const variantesVisibles = (g) =>
    tallaActiva ? g.variantes.filter((v) => tallaDe(v) === tallaActiva) : g.variantes

  const stockDe = (g, sedeIdFiltro) =>
    variantesVisibles(g).reduce(
      (sum, v) =>
        sum + (v.stock.find((s) => s.sede_id === sedeIdFiltro)?.cantidad || 0),
      0,
    )
  const totalDe = (g) =>
    variantesVisibles(g).reduce(
      (sum, v) => sum + v.stock.reduce((a, b) => a + b.cantidad, 0),
      0,
    )
  const totalVistaDe = (g) =>
    sedeActiva ? stockDe(g, Number(sedeActiva)) : totalDe(g)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()

    // Un código completo muestra solo el producto exacto, aunque los filtros
    // de sede/talla/stock lo oculten.
    if (q) {
      const exactos = grupos.filter((g) =>
        g.variantes.some((v) => coincideCodigoExacto(v, q)),
      )
      if (exactos.length) return exactos
    }

    return grupos.filter((g) => {
      const coincideCodigo =
        Boolean(q) && g.variantes.some((v) => coincideCodigoEtiqueta(v, q))
      if (coincideCodigo) return true

      if (catalogoId && g.catalogo !== catalogoId) return false
      if (categoriaId && g.categoria_id !== Number(categoriaId)) return false
      if (calidadActiva && g.calidad !== calidadActiva) return false
      if (tallaActiva && !g.variantes.some((v) => tallaDe(v) === tallaActiva)) return false
      if (sedeActiva && stockDe(g, Number(sedeActiva)) <= 0) return false
      const total = totalVistaDe(g)
      if (soloBajo && total > 5) return false
      if (q) {
        const visibles = variantesVisibles(g)
        const coincide =
          String(g.nombre || '').toLowerCase().includes(q) ||
          String(g.sku || '').toLowerCase().includes(q) ||
          visibles.some((v) => coincideCodigoEtiqueta(v, q))
        if (!coincide) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupos, busqueda, catalogoId, categoriaId, calidadActiva, tallaActiva, sedeActiva, soloBajo])

  const categoriasFiltro = categorias.filter((c) => !catalogoId || c.catalogo === catalogoId)

  // Resumen de unidades por CATEGORÍA sobre lo que está visible (respeta filtros).
  // Incluye desglose de tallas por sede: porSedeTallas[sedeId][talla] = cantidad.
  const resumen = useMemo(() => {
    const map = new Map()
    filtrados.forEach((g) => {
      let r = map.get(g.categoria_id)
      if (!r) {
        r = {
          categoria_id: g.categoria_id,
          nombre: categorias.find((c) => c.id === g.categoria_id)?.nombre || 'Sin categoría',
          total: 0,
          porSede: {},
          porSedeTallas: {},
        }
        map.set(g.categoria_id, r)
      }
      variantesVisibles(g).forEach((v) => {
        const talla = tallaDe(v)
        v.stock.forEach((s) => {
          if (sedeActiva && s.sede_id !== Number(sedeActiva)) return
          const cantidad = s.cantidad || 0
          if (cantidad === 0) return
          r.total += cantidad
          r.porSede[s.sede_id] = (r.porSede[s.sede_id] || 0) + cantidad
          const tallas = (r.porSedeTallas[s.sede_id] ||= {})
          tallas[talla] = (tallas[talla] || 0) + cantidad
        })
      })
    })
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados, categorias, tallaActiva, sedeActiva])

  const totalGeneral = resumen.reduce((sum, r) => sum + r.total, 0)
  const categoriaSel = categoriaId ? categorias.find((c) => c.id === Number(categoriaId)) : null
  const totalCategoriaSel = resumen.find((r) => r.categoria_id === Number(categoriaId))?.total ?? 0
  const sedeSel = sedeActiva ? sedes.find((s) => s.sede_id === Number(sedeActiva)) : null
  const colsTabla = `minmax(13rem,1fr) 4.5rem 9rem 5.5rem 4rem repeat(${sedesVisibles.length},5rem) 4.5rem 2rem`
  const colsDetalle = `7rem 7.5rem repeat(${sedesVisibles.length},5rem) 4.5rem`
  const colsResumen = `minmax(9rem,1fr) repeat(${sedesVisibles.length},4rem) 5rem`

  // Lista virtualizada: con cientos de productos solo se montan las filas visibles
  const virtualizer = useVirtualizer({
    count: filtrados.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 6,
  })

  function abrirModal(variante, sede) {
    setModal({ variante, sede })
    setTipo('entrada')
    setCantidad('')
    setMotivo('')
    setAjusteError(null)
  }

  function cerrarModal() {
    if (ajustando) return
    setModal(null)
  }

  async function confirmarAjuste() {
    if (!modal || !Number(cantidad) || Number(cantidad) <= 0) return
    setAjustando(true)
    setAjusteError(null)
    try {
      await inventarioApi.ajustar({
        variante_id: modal.variante.variante_id,
        sede_id: modal.sede.sede_id,
        tipo,
        cantidad: Number(cantidad),
        motivo: motivo || undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['inventario-completo'] })
      setAviso(`Stock actualizado: ${tipo} de ${Number(cantidad)} en ${modal.sede.sede}.`)
      setModal(null)
      window.setTimeout(() => setAviso(null), 4000)
    } catch (err) {
      setAjusteError(err?.message || 'No se pudo ajustar el stock')
    } finally {
      setAjustando(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-up mx-auto max-w-screen-2xl">
        <div className="mb-6 h-8 w-72 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-10 w-full animate-pulse rounded-xl border border-line bg-surface-2" />
        <div className="mt-4 h-96 animate-pulse rounded-2xl border border-line bg-surface-2" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-screen-2xl">
        <div className="animate-fade-in flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up mx-auto max-w-screen-2xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Inventario General
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Todo lo que existe en los catálogos (Hombre y Mujer), agrupado por producto. Clic para ver variantes y ajustar stock.
          </p>
        </div>
      </div>

      {aviso && (
        <div className="animate-fade-in mb-4 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink">
          <CheckIcon className="h-5 w-5 shrink-0 text-ink-2" />
          {aviso}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="relative min-w-64 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/60" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, SKU o código…"
            className={`${inputCls} pl-9`}
          />
        </div>

        <select
          value={catalogoId}
          onChange={(e) => {
            setCatalogoId(e.target.value)
            setCategoriaId('')
            setTallaId('')
            setCalidadId('')
          }}
          className={`${selectCls} w-48`}
        >
          <option value="">Ambos catálogos</option>
          <option value="hombre">Hombre</option>
          <option value="mujer">Mujer</option>
          <option value="fragancia">Fragancias</option>
        </select>

        <select
          value={categoriaId}
          onChange={(e) => {
            setCategoriaId(e.target.value)
            setTallaId('')
            setCalidadId('')
          }}
          className={`${selectCls} w-52`}
        >
          <option value="">Todas las categorías</option>
          {categoriasFiltro.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        <select
          value={calidadActiva}
          onChange={(e) => {
            setCalidadId(e.target.value)
            setTallaId('')
          }}
          className={`${selectCls} w-44`}
          disabled={calidadesDisponibles.length === 0}
          title="Calidades existentes para la categoría seleccionada"
        >
          <option value="">
            {calidadesDisponibles.length > 0 ? 'Todas las calidades' : 'Sin calidades'}
          </option>
          {calidadesDisponibles.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={tallaActiva}
          onChange={(e) => setTallaId(e.target.value)}
          className={`${selectCls} w-40`}
          disabled={tallasDisponibles.length === 0}
          title="Tallas existentes para la categoría/calidad seleccionada"
        >
          <option value="">
            {tallasDisponibles.length > 0 ? 'Todas las tallas' : 'Sin tallas'}
          </option>
          {tallasDisponibles.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={sedeActiva}
          onChange={(e) => setSedeId(e.target.value)}
          className={`${selectCls} w-52`}
          title="Ver el stock de una sola sede"
        >
          <option value="">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.sede_id} value={s.sede_id}>
              {s.sede}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setSoloBajo((v) => !v)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            soloBajo ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-2 hover:border-ink-2/40'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${soloBajo ? 'bg-white' : 'bg-ink-2/40'}`} />
          Solo stock bajo (≤5)
        </button>
      </div>

      {/* Tabla general por producto */}
      {filtrados.length === 0 ? (
        <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
          Sin productos para los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <div
            style={{ gridTemplateColumns: colsTabla }}
            className="grid items-center gap-2 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2"
          >
            <span>Producto</span>
            <span>Catálogo</span>
            <span>Categoría</span>
            <span>Calidad</span>
            <span className="text-center">Tallas</span>
            {sedesVisibles.map((s) => (
              <span key={s.sede_id} className="truncate text-center" title={s.sede}>
                {s.sede.split(' - ').pop()}
              </span>
            ))}
            <span className="text-right">Total</span>
            <span />
          </div>

          <div ref={parentRef} className="max-h-[70vh] overflow-auto">
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((row) => {
                const g = filtrados[row.index]
                const total = totalVistaDe(g)
                const abierto = expandido === g.producto_id
                return (
                  <div
                    key={g.producto_id}
                    ref={virtualizer.measureElement}
                    data-index={row.index}
                    className="absolute left-0 top-0 w-full"
                    style={{ transform: `translateY(${row.start}px)` }}
                  >
                    {/* Fila general del producto */}
                    <button
                      type="button"
                      onClick={() => setExpandido(abierto ? null : g.producto_id)}
                      style={{ gridTemplateColumns: colsTabla }}
                      className="grid w-full items-center gap-2 border-b border-line px-5 py-3 text-left text-sm transition-colors hover:bg-surface-2/40"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <img src={g.imagen_url} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg bg-surface-2 object-cover" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{g.nombre}</span>
                          <span className="block text-[11px] text-ink-2/70">{g.sku}</span>
                        </span>
                      </span>
                      <span className="truncate text-xs text-ink-2 capitalize">{g.catalogo || '—'}</span>
                      <span className="truncate text-ink-2">
                        {categorias.find((c) => c.id === g.categoria_id)?.nombre || '—'}
                      </span>
                      <span className="truncate text-xs font-medium text-ink-2" title={g.calidad}>
                        {g.calidad}
                      </span>
                      <span
                        className="truncate text-center text-ink-2"
                        title={
                          tallaActiva
                            ? `Talla ${tallaActiva}`
                            : `Tallas: ${g.variantes.map(tallaDe).join(', ')}`
                        }
                      >
                        {tallaActiva || g.variantes.length}
                      </span>
                      {sedesVisibles.map((s) => (
                        <span
                          key={s.sede_id}
                          className={`text-center font-semibold ${
                            stockDe(g, s.sede_id) === 0 ? 'text-ink-2/40' : 'text-ink'
                          }`}
                        >
                          {stockDe(g, s.sede_id)}
                        </span>
                      ))}
                      <span className={`text-right font-bold ${total === 0 ? 'text-ink-2/40' : 'text-ink'}`}>
                        {total}
                      </span>
                      <span className="justify-self-center">
                        <ChevronDownIcon className={`h-4 w-4 text-ink-2/70 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    {/* Detalle por variante */}
                    {abierto && (
                      <div className="animate-fade-in border-b border-line bg-surface-2/40 px-5 py-3">
                        <div
                          style={{ gridTemplateColumns: colsDetalle }}
                          className="grid items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-2"
                        >
                          <span>Talla</span>
                          <span>Código</span>
                          {sedesVisibles.map((s) => (
                            <span key={s.sede_id} className="truncate text-center">{s.sede.split(' - ').pop()}</span>
                          ))}
                          <span className="text-right">Total</span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {variantesVisibles(g).map((v) => {
                            const vTotal = sedeActiva
                              ? v.stock.find((x) => x.sede_id === Number(sedeActiva))?.cantidad || 0
                              : v.stock.reduce((a, b) => a + b.cantidad, 0)
                            return (
                              <li
                                key={v.variante_id}
                                style={{ gridTemplateColumns: colsDetalle }}
                                className="grid items-center gap-2 rounded-lg px-1 py-1 text-sm transition-colors hover:bg-white"
                              >
                                <span className="font-semibold text-ink">{v.talla || 'Unitalla'}</span>
                                <span className="truncate text-xs text-ink-2">{v.codigo_barras}</span>
                                {sedesVisibles.map((s) => {
                                  const reg = v.stock.find((x) => x.sede_id === s.sede_id)
                                  const cantidad = reg?.cantidad || 0
                                  return (
                                    <span key={s.sede_id} className="flex justify-center">
                                      <button
                                        type="button"
                                        onClick={() => reg && abrirModal(v, reg)}
                                        title={`Ajustar stock en ${s.sede}`}
                                        className={`rounded-lg px-1.5 py-0.5 font-semibold transition-colors hover:bg-white ${
                                          cantidad === 0 ? 'text-ink-2/40' : 'text-ink'
                                        }`}
                                      >
                                        {cantidad}
                                      </button>
                                    </span>
                                  )
                                })}
                                <span className={`text-right font-semibold ${vTotal === 0 ? 'text-ink-2/40' : 'text-ink'}`}>
                                  {vTotal}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                        <p className="mt-2 text-[11px] text-ink-2/70">
                          Haz clic en un número de la variante para ajustar entrada/salida de stock.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Barra fija inferior: totales por categoría */}
      {filtrados.length > 0 && (
        <div className="sticky bottom-0 z-20 mt-4">
          <div className="rounded-2xl border border-line bg-white/95 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3">
              <p className="text-sm font-semibold text-ink">
                {categoriaSel ? (
                  <>
                    Hay <span className="text-lg font-bold text-metal">{totalCategoriaSel}</span>{' '}
                    {categoriaSel.nombre}
                    {tallaActiva ? ` · Talla ${tallaActiva}` : ''}
                    {sedeSel ? ` · ${sedeSel.sede}` : ''}
                  </>
                ) : (
                  <>
                    Total en vista:{' '}
                    <span className="text-lg font-bold text-metal">{totalGeneral}</span> unidades
                    {tallaActiva ? ` · Talla ${tallaActiva}` : ''}
                    {sedeSel ? ` · ${sedeSel.sede}` : ''}
                  </>
                )}
              </p>
              <p className="text-xs text-ink-2">Resumen por categoría · clic para ver tallas por sede</p>
            </div>

            <div className="max-h-72 overflow-auto px-5 py-2">
              <div
                style={{ gridTemplateColumns: colsResumen }}
                className="grid items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-2"
              >
                <span>Categoría</span>
                {sedesVisibles.map((s) => (
                  <span key={s.sede_id} className="truncate text-center" title={s.sede}>
                    {s.sede.split(' - ').pop()}
                  </span>
                ))}
                <span className="text-right">Total</span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {resumen.map((r) => {
                  const abierta = categoriaAbierta === r.categoria_id
                  return (
                    <li key={r.categoria_id}>
                      <button
                        type="button"
                        onClick={() => setCategoriaAbierta(abierta ? null : r.categoria_id)}
                        style={{ gridTemplateColumns: colsResumen }}
                        className="grid w-full items-center gap-2 rounded-lg py-1 text-sm transition-colors hover:bg-surface-2/60"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <ChevronDownIcon
                            className={`h-3.5 w-3.5 shrink-0 text-ink-2/70 transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`}
                          />
                          <span className="truncate font-medium text-ink">{r.nombre}</span>
                        </span>
                        {sedesVisibles.map((s) => (
                          <span
                            key={s.sede_id}
                            className={`text-center ${r.porSede[s.sede_id] ? 'text-ink' : 'text-ink-2/40'}`}
                          >
                            {r.porSede[s.sede_id] || 0}
                          </span>
                        ))}
                        <span className="text-right font-bold text-ink">{r.total}</span>
                      </button>

                      {abierta && (
                        <div
                          style={{ gridTemplateColumns: colsResumen }}
                          className="animate-fade-in grid items-start gap-2 px-0.5 pb-2 pt-1"
                        >
                          <span />
                          {sedesVisibles.map((s) => {
                            const tallas = Object.entries(r.porSedeTallas[s.sede_id] || {}).sort((a, b) =>
                              ordenTalla(a[0], b[0]),
                            )
                            return (
                              <div key={s.sede_id} className="rounded-lg border border-line bg-surface-2/50 p-2">
                                <p className="mb-1 text-center text-[11px] font-bold text-ink">
                                  {r.porSede[s.sede_id] || 0}
                                </p>
                                {tallas.length === 0 ? (
                                  <p className="text-center text-[11px] text-ink-2/50">—</p>
                                ) : (
                                  <ul className="space-y-0.5">
                                    {tallas.map(([talla, cant]) => (
                                      <li
                                        key={talla}
                                        title={talla}
                                        className="flex items-center justify-between gap-1 text-[11px] text-ink-2"
                                      >
                                        <span className="truncate">{talla}</span>
                                        <span className="font-semibold text-ink">{cant}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )
                          })}
                          <span />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal de ajuste de stock */}
      {modal && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold tracking-tight text-ink">Ajustar stock</h3>
              <button
                type="button"
                onClick={cerrarModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-2 p-3">
              <img src={modal.variante.imagen_url} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-white object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {modal.variante.nombre}
                  {modal.variante.talla ? ` · ${modal.variante.talla}` : ''}
                </p>
                <p className="truncate text-xs text-ink-2">
                  {modal.sede.sede} · stock actual: {modal.sede.cantidad}
                </p>
              </div>
            </div>

            {ajusteError && (
              <p className="animate-fade-in mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {ajusteError}
              </p>
            )}

            <div className="mb-4 inline-flex w-full rounded-lg border border-line bg-surface-2 p-0.5">
              {['entrada', 'salida'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium capitalize transition-all duration-200 ${
                    tipo === t ? 'bg-ink text-white shadow-sm' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {t === 'entrada' ? <PlusIcon className="h-4 w-4" /> : <MinusIcon className="h-4 w-4" />}
                  {t}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label htmlFor="cantidad" className="mb-1.5 block text-sm font-medium text-ink">Cantidad</label>
              <input
                id="cantidad"
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0"
                autoFocus
                className={inputCls}
              />
            </div>

            <div className="mb-5">
              <label htmlFor="motivo" className="mb-1.5 block text-sm font-medium text-ink">
                Motivo <span className="text-ink-2/60">(opcional)</span>
              </label>
              <input
                id="motivo"
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. reposición, merma, transferencia…"
                className={inputCls}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={ajustando}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAjuste}
                disabled={ajustando || !Number(cantidad) || Number(cantidad) <= 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {ajustando ? 'Ajustando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}