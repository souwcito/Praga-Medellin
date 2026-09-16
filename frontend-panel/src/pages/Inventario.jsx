import { useEffect, useMemo, useState } from 'react'
import { catalogApi, inventarioApi } from '../services/api'
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

export default function Inventario() {
  const [categorias, setCategorias] = useState([])
  const [variantes, setVariantes] = useState([])

  const [busqueda, setBusqueda] = useState('')
  const [catalogoId, setCatalogoId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [soloBajo, setSoloBajo] = useState(false)
  const [expandido, setExpandido] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)

  // Modal de ajuste
  const [modal, setModal] = useState(null) // { variante, sede }
  const [tipo, setTipo] = useState('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [ajustando, setAjustando] = useState(false)
  const [ajusteError, setAjusteError] = useState(null)

  useEffect(() => {
    Promise.all([catalogApi.getCategorias(), catalogApi.getInventarioCompleto()])
      .then(([c, inv]) => {
        setCategorias(c)
        setVariantes(inv)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando el inventario'))
      .finally(() => setLoading(false))
  }, [])

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
    return [...map.values()]
  }, [variantes])

  const sedes = variantes[0]?.stock.map((s) => ({ sede_id: s.sede_id, sede: s.sede })) || []

  const stockDe = (g, sedeId) =>
    g.variantes.reduce(
      (sum, v) => sum + (v.stock.find((s) => s.sede_id === sedeId)?.cantidad || 0),
      0,
    )
  const totalDe = (g) => g.variantes.reduce((sum, v) => sum + v.stock.reduce((a, b) => a + b.cantidad, 0), 0)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return grupos.filter((g) => {
      if (catalogoId && g.catalogo !== catalogoId) return false
      if (categoriaId && g.categoria_id !== Number(categoriaId)) return false
      const total = totalDe(g)
      if (soloBajo && total > 5) return false
      if (
        q &&
        !g.nombre.toLowerCase().includes(q) &&
        !g.sku.toLowerCase().includes(q) &&
        !g.variantes.some((v) => v.codigo_barras.includes(q))
      ) {
        return false
      }
      return true
    })
  }, [grupos, busqueda, catalogoId, categoriaId, soloBajo])

  const categoriasFiltro = categorias.filter((c) => !catalogoId || c.catalogo === catalogoId)

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
      const inv = await catalogApi.getInventarioCompleto()
      setVariantes(inv)
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
          }}
          className={`${selectCls} w-48`}
        >
          <option value="">Ambos catálogos</option>
          <option value="hombre">Hombre</option>
          <option value="mujer">Mujer</option>
        </select>

        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className={`${selectCls} w-52`}
        >
          <option value="">Todas las categorías</option>
          {categoriasFiltro.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
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
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[minmax(13rem,1fr)_4.5rem_9rem_4rem_repeat(4,5rem)_4.5rem_2rem] items-center gap-2 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <span>Producto</span>
            <span>Catálogo</span>
            <span>Categoría</span>
            <span className="text-center">Tallas</span>
            {sedes.map((s) => (
              <span key={s.sede_id} className="truncate text-center" title={s.sede}>
                {s.sede.split(' - ').pop()}
              </span>
            ))}
            <span className="text-right">Total</span>
            <span />
          </div>

          <ul className="divide-y divide-line">
            {filtrados.map((g) => {
              const total = totalDe(g)
              const abierto = expandido === g.producto_id
              return (
                <li key={g.producto_id}>
                  {/* Fila general del producto */}
                  <button
                    type="button"
                    onClick={() => setExpandido(abierto ? null : g.producto_id)}
                    className="grid w-full grid-cols-[minmax(13rem,1fr)_4.5rem_9rem_4rem_repeat(4,5rem)_4.5rem_2rem] items-center gap-2 px-5 py-3 text-left text-sm transition-colors hover:bg-surface-2/40"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <img src={g.imagen_url} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-surface-2 object-cover" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{g.nombre}</span>
                        <span className="block text-[11px] text-ink-2/70">{g.sku}</span>
                      </span>
                    </span>
                    <span className="truncate text-xs text-ink-2 capitalize">{g.catalogo || '—'}</span>
                    <span className="truncate text-ink-2">
                      {categorias.find((c) => c.id === g.categoria_id)?.nombre || '—'}
                    </span>
                    <span className="text-center text-ink-2">{g.variantes.length}</span>
                    {sedes.map((s) => (
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
                    <div className="animate-fade-in border-t border-line bg-surface-2/40 px-5 py-3">
                      <div className="grid grid-cols-[7rem_7.5rem_repeat(4,5rem)_4.5rem] items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
                        <span>Talla</span>
                        <span>Código</span>
                        {sedes.map((s) => (
                          <span key={s.sede_id} className="truncate text-center">{s.sede.split(' - ').pop()}</span>
                        ))}
                        <span className="text-right">Total</span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {g.variantes.map((v) => {
                          const vTotal = v.stock.reduce((a, b) => a + b.cantidad, 0)
                          return (
                            <li
                              key={v.variante_id}
                              className="grid grid-cols-[7rem_7.5rem_repeat(4,5rem)_4.5rem] items-center gap-2 rounded-lg px-1 py-1 text-sm transition-colors hover:bg-white"
                            >
                              <span className="font-semibold text-ink">{v.talla || 'Única'}</span>
                              <span className="truncate text-xs text-ink-2">{v.codigo_barras}</span>
                              {v.stock.map((s) => (
                                <span key={s.sede_id} className="flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => abrirModal(v, s)}
                                    title={`Ajustar stock en ${s.sede}`}
                                    className={`rounded-lg px-1.5 py-0.5 font-semibold transition-colors hover:bg-white ${
                                      s.cantidad === 0 ? 'text-ink-2/40' : 'text-ink'
                                    }`}
                                  >
                                    {s.cantidad}
                                  </button>
                                </span>
                              ))}
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
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Modal de ajuste de stock */}
      {modal && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-dark/70 p-4">
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
        </div>
      )}
    </div>
  )
}