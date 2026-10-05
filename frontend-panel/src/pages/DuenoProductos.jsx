import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDuenoResumen } from '../hooks/useData'
import { duenoApi } from '../services/api'
import { AlertIcon, CheckIcon, SearchIcon, XIcon } from '../components/icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const nro = (n) => new Intl.NumberFormat('es-CO').format(n || 0)

const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

// Costo editable en línea: se guarda al Enter o al salir del campo.
function CostoEditable({ producto, onGuardar }) {
  const [valor, setValor] = useState(producto.costo ?? '')
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState(null)

  async function guardar() {
    const limpio = valor === '' || valor === null ? null : Number(valor)
    if (valor !== '' && (!Number.isFinite(limpio) || limpio < 0)) {
      setError('Valor inválido')
      return
    }
    if (limpio === producto.costo) return
    setGuardando(true)
    setError(null)
    try {
      await onGuardar(producto.producto_id, limpio)
      setOk(true)
      window.setTimeout(() => setOk(false), 1500)
    } catch (e) {
      setError(e?.message || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={guardar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setValor(producto.costo ?? '')
          }}
          placeholder="—"
          className="w-28 rounded-lg border border-line bg-white px-2 py-1.5 text-right text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
        />
        {guardando && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />}
        {ok && !guardando && <CheckIcon className="h-4 w-4 shrink-0 text-emerald-700" />}
      </div>
      {error && <p className="mt-0.5 text-[10px] text-red-700">{error}</p>}
    </div>
  )
}

export default function DuenoProductos() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error: errorRaw } = useDuenoResumen()
  const error = errorRaw?.message || (isError ? 'Error cargando los productos' : null)

  const [busqueda, setBusqueda] = useState('')
  const [catalogo, setCatalogo] = useState('')
  const [categoria, setCategoria] = useState('')

  const productos = data?.productos || []

  const categorias = useMemo(() => {
    const mapa = new Map()
    productos.forEach((p) => {
      if (p.categoria) mapa.set(p.categoria, p.catalogo)
    })
    return [...mapa.entries()]
      .filter(([, cat]) => !catalogo || cat === catalogo)
      .map(([nombre]) => nombre)
      .sort()
  }, [productos, catalogo])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter(
      (p) =>
        (!q || p.nombre.toLowerCase().includes(q) || (p.nombre_interno || '').toLowerCase().includes(q)) &&
        (!catalogo || p.catalogo === catalogo) &&
        (!categoria || p.categoria === categoria),
    )
  }, [productos, busqueda, catalogo, categoria])

  async function guardarCosto(id, costo) {
    await duenoApi.updateCosto(id, costo)
    queryClient.invalidateQueries({ queryKey: ['dueno-resumen'] })
  }

  if (isLoading) {
    return (
      <div className="animate-fade-up mx-auto max-w-7xl">
        <div className="mb-6 h-8 w-72 animate-pulse rounded-lg bg-surface-2" />
        <div className="mb-4 h-12 w-full animate-pulse rounded-xl border border-line bg-surface-2" />
        <div className="h-96 animate-pulse rounded-2xl border border-line bg-surface-2" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="animate-fade-in flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Productos y costos</h1>
        <p className="mt-1 text-sm text-ink-2">
          Ponle a cada producto cuánto te cuesta; a la derecha ves el precio de venta y la mercancía por sede.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/60" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select value={catalogo} onChange={(e) => { setCatalogo(e.target.value); setCategoria('') }} className={`${inputCls} w-44`}>
          <option value="">Ambos catálogos</option>
          <option value="hombre">Hombre</option>
          <option value="mujer">Mujer</option>
        </select>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={`${inputCls} w-48`}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <div className="grid min-w-[1100px] grid-cols-[minmax(13rem,1fr)_9rem_7rem_7rem_7rem_8rem_8rem_7rem_9rem] items-center gap-3 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
          <span>Producto</span>
          <span>Costo</span>
          <span className="text-right">Precio</span>
          <span className="text-right">Und</span>
          <span className="text-right">Valor costo</span>
          <span className="text-right">Valor venta</span>
          <span className="text-right">Margen</span>
          <span className="text-right">Stock por sede</span>
          <span className="text-right">Sin costo</span>
        </div>

        <ul className="divide-y divide-line">
          {filtrados.map((p) => (
            <li
              key={p.producto_id}
              className="grid min-w-[1100px] grid-cols-[minmax(13rem,1fr)_9rem_7rem_7rem_7rem_8rem_8rem_7rem_9rem] items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-surface-2/40"
            >
              <span className="min-w-0">
                <p className="truncate font-medium text-ink">{p.nombre}</p>
                <p className="truncate text-xs text-ink-2">
                  {p.categoria || 'Sin categoría'}
                  {p.subcategoria ? ` · ${p.subcategoria}` : ''}
                </p>
              </span>
              <CostoEditable producto={p} onGuardar={guardarCosto} />
              <span className="text-right text-ink">{formato(p.precio)}</span>
              <span className="text-right text-ink">{nro(p.unidades)}</span>
              <span className="text-right text-ink">{formato(p.valor_costo)}</span>
              <span className="text-right text-ink">{formato(p.valor_venta)}</span>
              <span className={`text-right font-semibold ${p.margen >= 0 ? 'text-ink' : 'text-red-700'}`}>
                {formato(p.margen)}
              </span>
              <span className="flex flex-wrap justify-end gap-1">
                {p.stock_por_sede.map((s) => (
                  <span key={s.sede_id} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-2">
                    {s.cantidad > 0 ? nro(s.cantidad) : <XIcon className="h-3 w-3 text-ink-2/40" />}
                    <span className="text-ink-2/70">{s.sede_id}</span>
                  </span>
                ))}
              </span>
              <span className="text-right text-ink-2">{p.costo == null ? <XIcon className="ml-auto h-4 w-4 text-red-700/70" /> : <CheckIcon className="ml-auto h-4 w-4 text-emerald-700" />}</span>
            </li>
          ))}
        </ul>
        {filtrados.length === 0 && (
          <div className="grid h-40 place-items-center text-sm text-ink-2/70">Sin productos para los filtros.</div>
        )}
      </div>
    </div>
  )
}