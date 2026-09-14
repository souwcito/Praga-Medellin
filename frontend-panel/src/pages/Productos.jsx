import { useEffect, useMemo, useState } from 'react'
import { catalogApi, productosApi } from '../services/api'
import { categoriaTieneSubcategorias, tallasPara } from '../utils/catalogo'
import {
  AlertIcon,
  CheckIcon,
  EditIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from '../components/icons'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const selectCls =
  'select-field w-full rounded-lg border border-line bg-white px-3 py-2 pr-9 text-sm text-ink transition-colors focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const CAMPOS_INICIALES = {
  nombre: '',
  descripcion: '',
  precio: '',
  sku: '',
  categoria_id: '',
  subcategoria_id: '',
  imagen_url: '',
}

// Código de barras sugerido (editable). El backend real asignará los definitivos.
function sugerirBarra(idx) {
  const base = (Date.now() + idx * 1000) % 100000000
  return '770' + String(base).padStart(10, '0')
}

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])

  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroSubcategoria, setFiltroSubcategoria] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)

  // Formulario crear/editar: form = null (cerrado), {} (crear) o {producto} (editar)
  const [form, setForm] = useState(null)
  const [campos, setCampos] = useState(CAMPOS_INICIALES)
  const [variantesForm, setVariantesForm] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState(null)

  const [modalDelete, setModalDelete] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    Promise.all([
      productosApi.list({}),
      catalogApi.getCategorias(),
      catalogApi.getSubcategorias(),
    ])
      .then(([p, c, s]) => {
        setProductos(p)
        setCategorias(c)
        setSubcategorias(s)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando productos'))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter((p) => {
      if (filtroCategoria && p.categoria_id !== Number(filtroCategoria)) return false
      if (filtroSubcategoria && p.subcategoria_id !== Number(filtroSubcategoria)) return false
      if (
        q &&
        !p.nombre.toLowerCase().includes(q) &&
        !(p.sku || '').toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [productos, busqueda, filtroCategoria, filtroSubcategoria])

  const subcatsFiltro = subcategorias.filter(
    (s) => !filtroCategoria || s.categoria_id === Number(filtroCategoria),
  )

  // En el formulario: subcategorías y tallas de la combinación elegida
  const subcatsForm = subcategorias.filter(
    (s) => !campos.categoria_id || s.categoria_id === Number(campos.categoria_id),
  )
  const necesitaSubcategoria =
    campos.categoria_id && categoriaTieneSubcategorias(campos.categoria_id, subcategorias)
  const tallasActivas =
    campos.categoria_id && !(necesitaSubcategoria && !campos.subcategoria_id)
      ? tallasPara(campos.categoria_id, campos.subcategoria_id, categorias, subcategorias)
      : null

  async function refrescar() {
    const lista = await productosApi.list({})
    setProductos(lista)
  }

  function cambiarFiltroCategoria(e) {
    setFiltroCategoria(e.target.value)
    setFiltroSubcategoria('')
  }

  // Construye la lista de variantes (talla + código + stock inicial) según la
  // combinación elegida. Si hay tallas las usa; si no, crea una variante única.
  function construirVariantes(categoriaId, subcategoriaId, existentes = []) {
    const tallas = tallasPara(categoriaId, subcategoriaId, categorias, subcategorias)
    const lista = tallas.length ? tallas : [null]
    return lista.map((t, idx) => {
      const ex = existentes[idx]
      return {
        talla: t,
        codigo_barras: ex ? ex.codigo_barras : sugerirBarra(idx),
        stock_inicial: ex ? ex.stock_total : '',
      }
    })
  }

  function abrirCrear() {
    setCampos({ ...CAMPOS_INICIALES, imagen_url: '/images/products/camiseta.svg' })
    setVariantesForm([])
    setForm({})
    setFormError(null)
  }

  function abrirEditar(p) {
    setCampos({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: String(p.precio),
      sku: p.sku || '',
      categoria_id: String(p.categoria_id || ''),
      subcategoria_id: String(p.subcategoria_id || ''),
      imagen_url: p.imagen_url || '',
    })
    setVariantesForm(construirVariantes(p.categoria_id, p.subcategoria_id, p.variantes))
    setForm(p)
    setFormError(null)
  }

  function cerrarForm() {
    if (guardando) return
    setForm(null)
  }

  function setCampo(clave, valor) {
    setCampos((c) => ({ ...c, [clave]: valor }))
  }

  function cambiarCategoria(e) {
    const value = e.target.value
    setCampos((c) => ({ ...c, categoria_id: value, subcategoria_id: '' }))
    setVariantesForm([])
  }

  function cambiarSubcategoria(e) {
    const value = e.target.value
    setCampos((c) => ({ ...c, subcategoria_id: value }))
    // Genera automáticamente los campos de stock/código por cada talla válida
    if (value) {
      setVariantesForm(construirVariantes(campos.categoria_id, value))
    } else {
      setVariantesForm([])
    }
  }

  function cambiarVariante(idx, clave, valor) {
    setVariantesForm((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [clave]: valor } : v)),
    )
  }

  async function guardar() {
    if (!campos.nombre.trim() || !Number(campos.precio)) {
      setFormError('Nombre y precio son obligatorios')
      return
    }
    if (necesitaSubcategoria && !campos.subcategoria_id) {
      setFormError('Selecciona la subcategoría para definir las tallas')
      return
    }
    setGuardando(true)
    setFormError(null)
    try {
      const payload = {
        nombre: campos.nombre.trim(),
        descripcion: campos.descripcion.trim(),
        precio: Number(campos.precio),
        sku: campos.sku.trim() || null,
        categoria_id: campos.categoria_id ? Number(campos.categoria_id) : null,
        subcategoria_id: campos.subcategoria_id ? Number(campos.subcategoria_id) : null,
        imagen_url: campos.imagen_url.trim() || '/images/products/camiseta.svg',
        variantes: variantesForm.map((v) => ({
          talla: v.talla,
          codigo_barras: v.codigo_barras,
          stock_inicial: v.stock_inicial,
        })),
      }
      if (form.id) {
        await productosApi.update(form.id, payload)
        setAviso('Producto actualizado.')
      } else {
        await productosApi.create(payload)
        setAviso('Producto creado con sus variantes.')
      }
      setForm(null)
      await refrescar()
      window.setTimeout(() => setAviso(null), 4000)
    } catch (err) {
      setFormError(err?.message || 'No se pudo guardar el producto')
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarEliminar() {
    if (!modalDelete) return
    setEliminando(true)
    try {
      await productosApi.remove(modalDelete.id)
      setModalDelete(null)
      setAviso('Producto eliminado.')
      await refrescar()
      window.setTimeout(() => setAviso(null), 4000)
    } catch (err) {
      setError(err?.message || 'No se pudo eliminar el producto')
    } finally {
      setEliminando(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-up mx-auto max-w-7xl">
        <div className="mb-6 h-8 w-72 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-10 w-full animate-pulse rounded-xl border border-line bg-surface-2" />
        <div className="mt-4 h-96 animate-pulse rounded-2xl border border-line bg-surface-2" />
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
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Productos</h1>
          <p className="mt-1 text-sm text-ink-2">
            Catálogo por categoría → subcategoría → tallas. Cada talla es una variante con su código de barras.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-metal-2 hover:shadow-lg hover:shadow-ink/20 active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo producto
        </button>
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
            placeholder="Buscar por nombre o SKU…"
            className={`${inputCls} pl-9`}
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={cambiarFiltroCategoria}
          className={`${selectCls} w-52`}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtroSubcategoria}
          onChange={(e) => setFiltroSubcategoria(e.target.value)}
          className={`${selectCls} w-52`}
          disabled={!filtroCategoria || subcatsFiltro.length === 0}
        >
          <option value="">Todas las subcategorías</option>
          {subcatsFiltro.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
          Sin productos para los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[minmax(14rem,1fr)_6rem_7rem_8rem_6rem_4rem_7rem] items-center gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <span>Producto</span>
            <span>SKU</span>
            <span>Variantes</span>
            <span>Categoría</span>
            <span className="text-right">Precio</span>
            <span className="text-center">Stock</span>
            <span className="text-right">Acciones</span>
          </div>

          <ul className="divide-y divide-line">
            {filtrados.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[minmax(14rem,1fr)_6rem_7rem_8rem_6rem_4rem_7rem] items-center gap-4 px-5 py-2.5 text-sm transition-colors hover:bg-surface-2/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={p.imagen_url}
                    alt={p.nombre}
                    className="h-10 w-10 shrink-0 rounded-lg bg-surface-2 object-cover"
                  />
                  <p className="truncate font-medium text-ink">{p.nombre}</p>
                </div>
                <span className="truncate text-ink-2">{p.sku || '—'}</span>
                <span className="text-ink-2">
                  {p.variantes.length === 1
                    ? p.variantes[0].talla
                      ? `1 talla`
                      : 'Única'
                    : `${p.variantes.length} tallas`}
                </span>
                <span className="truncate text-ink-2">
                  {p.categoria || '—'}
                  {p.subcategoria ? ` · ${p.subcategoria}` : ''}
                </span>
                <span className="text-right font-semibold text-ink">{formato(p.precio)}</span>
                <span
                  className={`text-center font-semibold ${
                    p.stock_total === 0 ? 'text-ink-2/40' : 'text-ink'
                  }`}
                >
                  {p.stock_total}
                </span>
                <span className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => abrirEditar(p)}
                    title="Editar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink active:scale-90"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalDelete(p)}
                    title="Eliminar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-red-50 hover:text-red-700 active:scale-90"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Formulario crear/editar */}
      {form !== null && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                {form.id ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button
                type="button"
                onClick={cerrarForm}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <p className="animate-fade-in mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="p-nombre" className="mb-1.5 block text-sm font-medium text-ink">
                  Nombre <span className="text-red-700">*</span>
                </label>
                <input
                  id="p-nombre"
                  type="text"
                  value={campos.nombre}
                  onChange={(e) => setCampo('nombre', e.target.value)}
                  placeholder="Ej. Camiseta Premium 1.1 Boxeada"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="p-descripcion" className="mb-1.5 block text-sm font-medium text-ink">
                  Descripción
                </label>
                <textarea
                  id="p-descripcion"
                  value={campos.descripcion}
                  onChange={(e) => setCampo('descripcion', e.target.value)}
                  rows={2}
                  placeholder="Opcional"
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-precio" className="mb-1.5 block text-sm font-medium text-ink">
                    Precio (COP) <span className="text-red-700">*</span>
                  </label>
                  <input
                    id="p-precio"
                    type="number"
                    min={0}
                    step={1000}
                    value={campos.precio}
                    onChange={(e) => setCampo('precio', e.target.value)}
                    placeholder="89000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="p-sku" className="mb-1.5 block text-sm font-medium text-ink">
                    SKU
                  </label>
                  <input
                    id="p-sku"
                    type="text"
                    value={campos.sku}
                    onChange={(e) => setCampo('sku', e.target.value)}
                    placeholder="Ej. CAM-P11-01"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-categoria" className="mb-1.5 block text-sm font-medium text-ink">
                    Categoría <span className="text-red-700">*</span>
                  </label>
                  <select
                    id="p-categoria"
                    value={campos.categoria_id}
                    onChange={cambiarCategoria}
                    className={selectCls}
                  >
                    <option value="">Selecciona…</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-subcategoria" className="mb-1.5 block text-sm font-medium text-ink">
                    Subcategoría
                  </label>
                  <select
                    id="p-subcategoria"
                    value={campos.subcategoria_id}
                    onChange={cambiarSubcategoria}
                    className={selectCls}
                    disabled={subcatsForm.length === 0}
                  >
                    <option value="">
                      {subcatsForm.length === 0 ? 'Sin subcategorías' : 'Selecciona…'}
                    </option>
                    {subcatsForm.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Variantes auto-generadas */}
              {campos.categoria_id ? (
                necesitaSubcategoria && !campos.subcategoria_id ? (
                  <div className="rounded-xl border border-dashed border-line bg-surface-2/50 p-4 text-sm text-ink-2">
                    Esta categoría tiene subcategorías: selecciónala para generar las tallas/variantes.
                  </div>
                ) : (
                  <div className="rounded-xl border border-line bg-surface-2/40 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">Tallas / variantes</p>
                      <span className="text-xs text-ink-2">
                        {tallasActivas.length === 0 ? 'Talla única' : `${tallasActivas.length} tallas`}
                      </span>
                    </div>
                    <p className="mb-3 text-xs text-ink-2">
                      Cada variante lleva su propio código de barras (inventario por unidad exacta).
                    </p>
                    <div className="grid grid-cols-[4.5rem_1fr_7rem] items-center gap-3 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
                      <span>Talla</span>
                      <span>Código de barras</span>
                      <span className="text-right">{form.id ? 'Stock total' : 'Stock inicial'}</span>
                    </div>
                    <div className="space-y-2">
                      {variantesForm.map((v, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-[4.5rem_1fr_7rem] items-center gap-3"
                        >
                          <span className="rounded-lg bg-white px-2 py-2 text-center text-sm font-semibold text-ink ring-1 ring-line">
                            {v.talla || 'Única'}
                          </span>
                          <input
                            type="text"
                            value={v.codigo_barras}
                            onChange={(e) => cambiarVariante(idx, 'codigo_barras', e.target.value)}
                            placeholder="Código de barras"
                            className={inputCls}
                          />
                          <input
                            type="number"
                            min={0}
                            value={v.stock_inicial}
                            onChange={(e) => cambiarVariante(idx, 'stock_inicial', e.target.value)}
                            disabled={Boolean(form.id)}
                            placeholder="0"
                            className={`${inputCls} text-right disabled:opacity-50`}
                          />
                        </div>
                      ))}
                    </div>
                    {form.id && (
                      <p className="mt-3 text-xs text-ink-2">
                        El stock se ajusta desde Inventario; aquí solo se edita el código de barras.
                      </p>
                    )}
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-2/70">
                  Elige la categoría para generar automáticamente las tallas/variantes.
                </div>
              )}

              <div>
                <label htmlFor="p-imagen" className="mb-1.5 block text-sm font-medium text-ink">
                  URL de la imagen
                </label>
                <div className="flex items-center gap-3">
                  {campos.imagen_url && (
                    <img
                      src={campos.imagen_url}
                      alt="Vista previa"
                      className="h-10 w-10 shrink-0 rounded-lg bg-surface-2 object-cover"
                    />
                  )}
                  <input
                    id="p-imagen"
                    type="text"
                    value={campos.imagen_url}
                    onChange={(e) => setCampo('imagen_url', e.target.value)}
                    placeholder="/images/products/camiseta.svg"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={cerrarForm}
                disabled={guardando}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98] disabled:opacity-50"
              >
                {guardando ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      {modalDelete && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
              ¿Eliminar producto?
            </h3>
            <p className="mt-2 text-sm text-ink-2">
              Se eliminará <span className="font-medium text-ink">{modalDelete.nombre}</span>, sus
              variantes y el stock en las 4 sedes. Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setModalDelete(null)}
                disabled={eliminando}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                disabled={eliminando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-700 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-red-800 active:scale-[0.98] disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
                {eliminando ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}