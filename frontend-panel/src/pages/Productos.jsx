import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { catalogApi, productosApi } from '../services/api'
import { categoriaTieneSubcategorias, tallasPara } from '../utils/catalogo'
import { urlImagen } from '../utils/imagenes'
import MultiImageUpload from '../components/MultiImageUpload'
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
  nombre_interno: '',
  descripcion: '',
  precio: '',
  precio_antes: '',
  sku: '',
  categoria_id: '',
  subcategoria_id: '',
  imagenes: [],
}

function Seccion({ titulo, descripcion, children }) {
  return (
    <section className="rounded-2xl border border-line p-4">
      <h4 className="text-sm font-semibold text-ink">{titulo}</h4>
      {descripcion && <p className="mt-0.5 text-xs text-ink-2">{descripcion}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function sugerirBarra(idx) {
  const base = (Date.now() + idx * 1000) % 100000000
  return '770' + String(base).padStart(10, '0')
}

export default function Productos() {
  const [searchParams, setSearchParams] = useSearchParams()
  const catalogo = searchParams.get('catalogo') || ''
  const filtroCategoria = searchParams.get('categoria') || ''
  const filtroSubcategoria = searchParams.get('subcategoria') || ''

  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [productos, setProductos] = useState([])

  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)

  const [form, setForm] = useState(null)
  const [campos, setCampos] = useState(CAMPOS_INICIALES)
  const [catalogoForm, setCatalogoForm] = useState('hombre')
  const [variantesForm, setVariantesForm] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState(null)

  const [modalDelete, setModalDelete] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    Promise.all([catalogApi.getCategorias(), catalogApi.getSubcategorias()])
      .then(([c, s]) => {
        setCategorias(c)
        setSubcategorias(s)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando catálogo'))
  }, [])

  useEffect(() => {
    productosApi
      .list({
        catalogo: catalogo || undefined,
        categoria_id: filtroCategoria || undefined,
        subcategoria_id: filtroSubcategoria || undefined,
      })
      .then((p) => {
        setProductos(p)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'Error cargando productos'))
      .finally(() => setLoading(false))
  }, [catalogo, filtroCategoria, filtroSubcategoria])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q),
    )
  }, [productos, busqueda])

  // Categorías/subcategorías según el catálogo activo (filtros)
  const categoriasFiltro = categorias.filter((c) => !catalogo || c.catalogo === catalogo)
  const subcatsFiltro = subcategorias.filter(
    (s) => !filtroCategoria || s.categoria_id === Number(filtroCategoria),
  )

  // En el formulario
  const categoriasForm = categorias.filter((c) => c.catalogo === catalogoForm)
  const subcatsForm = subcategorias.filter(
    (s) => !campos.categoria_id || s.categoria_id === Number(campos.categoria_id),
  )
  const necesitaSubcategoria =
    campos.categoria_id && categoriaTieneSubcategorias(campos.categoria_id, subcategorias)
  const tallasActivas =
    campos.categoria_id && !(necesitaSubcategoria && !campos.subcategoria_id)
      ? tallasPara(campos.categoria_id, campos.subcategoria_id, categorias, subcategorias)
      : null
  const categoriaFormActual = categorias.find((c) => c.id === Number(campos.categoria_id))
  const esOpcionalTallas = Boolean(categoriaFormActual?.tallas_opcionales)
  const usaTallas = variantesForm.some((v) => v.talla)

  function setUrlParam(clave, valor) {
    const next = new URLSearchParams(searchParams)
    if (valor) next.set(clave, String(valor))
    else next.delete(clave)
    setSearchParams(next, { replace: true })
  }

  function elegirCatalogo(valor) {
    setLoading(true)
    setUrlParam('catalogo', valor)
    setUrlParam('categoria', '')
    setUrlParam('subcategoria', '')
  }

  function elegirCategoria(valor) {
    setLoading(true)
    setUrlParam('categoria', valor)
    setUrlParam('subcategoria', '')
  }

  function elegirSubcategoria(valor) {
    setLoading(true)
    setUrlParam('subcategoria', valor)
  }

  function construirVariantes(catId, subId, existentes = []) {
    // Al editar: se conservan las tallas reales del producto
    if (existentes && existentes.length) {
      return existentes.map((ex, idx) => ({
        talla: ex.talla ?? null,
        codigo_barras: ex.codigo_barras || sugerirBarra(idx),
        stock_inicial: ex.stock_total ?? '',
      }))
    }
    const cat = categorias.find((c) => c.id === Number(catId))
    // Categorías con tallas OPCIONALES (ej. gorras): por defecto talla única
    if (cat?.tallas_opcionales) {
      return [{ talla: null, codigo_barras: sugerirBarra(0), stock_inicial: '' }]
    }
    const tallas = tallasPara(catId, subId, categorias, subcategorias)
    const lista = tallas.length ? tallas : [null]
    return lista.map((t, idx) => ({
      talla: t,
      codigo_barras: sugerirBarra(idx),
      stock_inicial: '',
    }))
  }

  function construirConTallas(catId, subId) {
    const tallas = tallasPara(catId, subId, categorias, subcategorias)
    const lista = tallas.length ? tallas : [null]
    return lista.map((t, idx) => ({
      talla: t,
      codigo_barras: sugerirBarra(idx),
      stock_inicial: '',
    }))
  }

  function ponerTallaUnica() {
    setVariantesForm((prev) => [
      { talla: null, codigo_barras: sugerirBarra(0), stock_inicial: prev[0]?.stock_inicial ?? '' },
    ])
  }

  function ponerConTallas() {
    setVariantesForm((prev) => {
      const lista = construirConTallas(campos.categoria_id, campos.subcategoria_id)
      return lista.map((v, i) => ({ ...v, stock_inicial: prev[i]?.stock_inicial ?? '' }))
    })
  }

  function agregarTalla() {
    setVariantesForm((prev) => [
      ...prev,
      { talla: '', codigo_barras: sugerirBarra(prev.length), stock_inicial: '' },
    ])
  }

  function quitarTalla(idx) {
    setVariantesForm((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

  function abrirCrear() {
    setCampos({ ...CAMPOS_INICIALES })
    setCatalogoForm(catalogo || 'hombre')
    setVariantesForm([])
    setForm({})
    setFormError(null)
  }

  function abrirEditar(p) {
    setCampos({
      nombre: p.nombre,
      nombre_interno: p.nombre_interno || '',
      descripcion: p.descripcion || '',
      precio: String(p.precio),
      precio_antes: p.precio_antes ? String(p.precio_antes) : '',
      sku: p.sku || '',
      categoria_id: String(p.categoria_id || ''),
      subcategoria_id: String(p.subcategoria_id || ''),
      imagenes: p.imagenes?.length ? p.imagenes : p.imagen_url ? [p.imagen_url] : [],
    })
    setCatalogoForm(p.catalogo || 'hombre')
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

  function cambiarCatalogoForm(e) {
    const valor = e.target.value
    setCatalogoForm(valor)
    setCampos((c) => ({ ...c, categoria_id: '', subcategoria_id: '' }))
    setVariantesForm([])
  }

  function cambiarCategoria(e) {
    const valor = e.target.value
    setCampos((c) => ({ ...c, categoria_id: valor, subcategoria_id: '' }))
    const necesitaSub = subcategorias.some((s) => s.categoria_id === Number(valor))
    setVariantesForm(necesitaSub ? [] : construirVariantes(valor, null))
  }

  function cambiarSubcategoria(e) {
    const valor = e.target.value
    setCampos((c) => ({ ...c, subcategoria_id: valor }))
    if (valor) {
      setVariantesForm(construirVariantes(campos.categoria_id, valor))
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
    if (campos.precio_antes && Number(campos.precio_antes) <= Number(campos.precio)) {
      setFormError('El precio normal debe ser mayor que el precio en promoción')
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
        nombre_interno: campos.nombre_interno.trim() || null,
        descripcion: campos.descripcion.trim(),
        precio: Number(campos.precio),
        precio_antes: campos.precio_antes ? Number(campos.precio_antes) : null,
        sku: campos.sku.trim() || null,
        categoria_id: campos.categoria_id ? Number(campos.categoria_id) : null,
        subcategoria_id: campos.subcategoria_id ? Number(campos.subcategoria_id) : null,
        imagenes: campos.imagenes,
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

  async function refrescar() {
    const lista = await productosApi.list({
      catalogo: catalogo || undefined,
      categoria_id: filtroCategoria || undefined,
      subcategoria_id: filtroSubcategoria || undefined,
    })
    setProductos(lista)
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

  const tituloCatalogo = catalogo === 'mujer' ? 'Catálogo Mujer' : catalogo === 'hombre' ? 'Catálogo Hombre' : 'Productos'

  return (
    <div className="animate-fade-up mx-auto max-w-7xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{tituloCatalogo}</h1>
          <p className="mt-1 text-sm text-ink-2">
            Crea, edita o elimina productos por catálogo, categoría y tallas (solo administradores).
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
        <div className="relative min-w-56 flex-1">
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
          value={catalogo}
          onChange={(e) => elegirCatalogo(e.target.value)}
          className={`${selectCls} w-48`}
        >
          <option value="">Ambos catálogos</option>
          <option value="hombre">Catálogo Hombre</option>
          <option value="mujer">Catálogo Mujer</option>
        </select>

        <select
          value={filtroCategoria}
          onChange={(e) => elegirCategoria(e.target.value)}
          className={`${selectCls} w-48`}
        >
          <option value="">Todas las categorías</option>
          {categoriasFiltro.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtroSubcategoria}
          onChange={(e) => elegirSubcategoria(e.target.value)}
          className={`${selectCls} w-48`}
          disabled={subcatsFiltro.length === 0}
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
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[minmax(14rem,1fr)_6rem_6rem_8rem_6rem_4rem_7rem] items-center gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <span>Producto</span>
            <span>SKU</span>
            <span>Catálogo</span>
            <span>Categoría</span>
            <span className="text-right">Precio</span>
            <span className="text-center">Stock</span>
            <span className="text-right">Acciones</span>
          </div>

          <ul className="divide-y divide-line">
            {filtrados.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[minmax(14rem,1fr)_6rem_6rem_8rem_6rem_4rem_7rem] items-center gap-4 px-5 py-2.5 text-sm transition-colors hover:bg-surface-2/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={urlImagen(p.imagen_url)}
                    alt={p.nombre}
                    className="h-10 w-10 shrink-0 rounded-lg bg-surface-2 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{p.nombre_interno || p.nombre}</p>
                    {p.nombre_interno && p.nombre_interno !== p.nombre && (
                      <p className="truncate text-xs text-ink-2">{p.nombre}</p>
                    )}
                    {p.es_oferta && (
                      <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        Oferta -{p.descuento}%
                      </span>
                    )}
                  </div>
                </div>
                <span className="truncate text-ink-2">{p.sku || '—'}</span>
                <span className="truncate text-ink-2">
                  {p.catalogo === 'mujer' ? 'Mujer' : p.catalogo === 'hombre' ? 'Hombre' : '—'}
                </span>
                <span className="truncate text-ink-2">
                  {p.categoria || '—'}
                  {p.subcategoria ? ` · ${p.subcategoria}` : ''}
                </span>
                <span className="text-right">
                  {p.es_oferta && (
                    <span className="mr-1.5 text-xs text-ink-2 line-through">
                      {formato(p.precio_antes)}
                    </span>
                  )}
                  <span className="font-semibold text-ink">{formato(p.precio)}</span>
                </span>
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
          <div className="animate-scale-in flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-line px-6 py-4">
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                  {form.id ? 'Editar producto' : 'Nuevo producto'}
                </h3>
                <p className="mt-0.5 text-xs text-ink-2">
                  Completa la información, las tallas y las imágenes.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarForm}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {formError && (
                <p className="animate-fade-in mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              )}

              <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                {/* Columna principal */}
                <div className="space-y-5">
                  <Seccion titulo="Información básica">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="p-nombre" className="mb-1.5 block text-sm font-medium text-ink">
                          Nombre público (aparece en la web) <span className="text-red-700">*</span>
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
                        <label htmlFor="p-nombre-interno" className="mb-1.5 block text-sm font-medium text-ink">
                          Nombre interno (solo para ti)
                        </label>
                        <input
                          id="p-nombre-interno"
                          type="text"
                          value={campos.nombre_interno}
                          onChange={(e) => setCampo('nombre_interno', e.target.value)}
                          placeholder="Ej. CAM-P11-01 Negro Lote 3"
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
                          rows={3}
                          placeholder="Detalles, tela, estampado… (opcional)"
                          className={`${inputCls} resize-none`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="p-precio-antes" className="mb-1.5 block text-sm font-medium text-ink">
                            Precio normal
                          </label>
                          <input
                            id="p-precio-antes"
                            type="number"
                            min={0}
                            step={1000}
                            value={campos.precio_antes}
                            onChange={(e) => setCampo('precio_antes', e.target.value)}
                            placeholder="99000"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label htmlFor="p-precio" className="mb-1.5 block text-sm font-medium text-ink">
                            Precio en promoción (COP) <span className="text-red-700">*</span>
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
                      </div>

                      <p className="text-xs text-ink-2">
                        Si llenas el <span className="font-medium">precio normal</span> con un valor
                        mayor al <span className="font-medium">precio en promoción</span>, el
                        producto se muestra con el precio normal tachado y aparece en la página{' '}
                        <span className="font-medium">Promociones</span>. Si lo dejas vacío, el
                        producto se vende a precio normal.
                      </p>

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
                  </Seccion>

                  <Seccion titulo="Catálogo" descripcion="Define a qué catálogo y categoría pertenece el producto.">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="p-catalogo" className="mb-1.5 block text-sm font-medium text-ink">
                          Catálogo <span className="text-red-700">*</span>
                        </label>
                        <select
                          id="p-catalogo"
                          value={catalogoForm}
                          onChange={cambiarCatalogoForm}
                          className={selectCls}
                        >
                          <option value="hombre">Hombre</option>
                          <option value="mujer">Mujer</option>
                        </select>
                      </div>
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
                          {categoriasForm.map((c) => (
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
                  </Seccion>

                  <Seccion
                    titulo="Tallas y variantes"
                    descripcion={
                      esOpcionalTallas
                        ? 'Puedes dejarlo en talla única o activar tallas. Cada variante lleva su propio código de barras.'
                        : 'Se generan automáticamente según la categoría. Cada variante lleva su propio código de barras.'
                    }
                  >
                    {campos.categoria_id ? (
                      necesitaSubcategoria && !campos.subcategoria_id ? (
                        <div className="rounded-xl border border-dashed border-line bg-surface-2/50 p-4 text-sm text-ink-2">
                          Esta categoría tiene subcategorías: selecciónala para generar las tallas/variantes.
                        </div>
                      ) : (
                        <div>
                          {esOpcionalTallas ? (
                            <div className="mb-3 inline-flex w-full rounded-lg border border-line bg-surface-2 p-0.5">
                              {[
                                { valor: false, label: 'Talla única' },
                                { valor: true, label: 'Con tallas' },
                              ].map((op) => (
                                <button
                                  key={op.label}
                                  type="button"
                                  onClick={() =>
                                    op.valor ? ponerConTallas() : ponerTallaUnica()
                                  }
                                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-all duration-200 ${
                                    usaTallas === op.valor
                                      ? 'bg-ink text-white shadow-sm'
                                      : 'text-ink-2 hover:text-ink'
                                  }`}
                                >
                                  {op.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="mb-2 text-xs text-ink-2">
                              {tallasActivas.length === 0
                                ? 'Talla única'
                                : `${tallasActivas.length} tallas automáticas`}
                            </p>
                          )}

                          <div className="grid grid-cols-[6rem_1fr_7rem_2rem] items-center gap-3 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
                            <span>Talla</span>
                            <span>Código de barras</span>
                            <span className="text-right">{form.id ? 'Stock total' : 'Stock inicial'}</span>
                            <span />
                          </div>

                          <div className="space-y-2">
                            {variantesForm.map((v, idx) => (
                              <div
                                key={idx}
                                className="grid grid-cols-[6rem_1fr_7rem_2rem] items-center gap-3"
                              >
                                {esOpcionalTallas ? (
                                  <input
                                    type="text"
                                    value={v.talla || ''}
                                    onChange={(e) => cambiarVariante(idx, 'talla', e.target.value || null)}
                                    placeholder="Única"
                                    className={`${inputCls} text-center`}
                                  />
                                ) : (
                                  <span className="rounded-lg bg-surface-2 px-2 py-2 text-center text-sm font-semibold text-ink ring-1 ring-line">
                                    {v.talla || 'Única'}
                                  </span>
                                )}
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
                                {esOpcionalTallas ? (
                                  <button
                                    type="button"
                                    onClick={() => quitarTalla(idx)}
                                    disabled={variantesForm.length <= 1}
                                    title="Quitar talla"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/40 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <span />
                                )}
                              </div>
                            ))}
                          </div>

                          {esOpcionalTallas && usaTallas && (
                            <button
                              type="button"
                              onClick={agregarTalla}
                              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink-2 transition-colors hover:text-ink"
                            >
                              <PlusIcon className="h-4 w-4" />
                              Agregar talla
                            </button>
                          )}

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
                  </Seccion>
                </div>

                {/* Columna lateral */}
                <div className="space-y-5">
                  <Seccion
                    titulo="Imágenes"
                    descripcion="JPG, PNG, WebP o HEIC de iPhone. La primera es la principal."
                  >
                    <MultiImageUpload
                      value={campos.imagenes}
                      onChange={(lista) => setCampo('imagenes', lista)}
                    />
                  </Seccion>

                  <Seccion titulo="Vista previa">
                    <div className="overflow-hidden rounded-xl border border-line bg-surface-2/40">
                      {campos.imagenes[0] ? (
                        <img
                          src={urlImagen(campos.imagenes[0])}
                          alt="Vista previa"
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <div className="grid aspect-square w-full place-items-center text-xs text-ink-2/50">
                          Sin imagen
                        </div>
                      )}
                      <div className="border-t border-line bg-white p-3">
                        <p className="truncate text-sm font-medium text-ink">
                          {campos.nombre || 'Nombre del producto'}
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-ink">
                          {campos.precio_antes && (
                            <span className="mr-1.5 text-xs font-medium text-ink-2 line-through">
                              {formato(Number(campos.precio_antes) || 0)}
                            </span>
                          )}
                          {formato(Number(campos.precio) || 0)}
                        </p>
                        <p className="truncate text-xs text-ink-2">
                          {categoriasForm.find((c) => c.id === Number(campos.categoria_id))?.nombre ||
                            'Categoría'}
                          {campos.subcategoria_id
                            ? ` · ${
                                subcategorias.find((s) => s.id === Number(campos.subcategoria_id))
                                  ?.nombre || ''
                              }`
                            : ''}
                        </p>
                        {variantesForm.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {variantesForm.map((v, i) => (
                              <span
                                key={i}
                                className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2"
                              >
                                {v.talla || 'Única'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Seccion>
                </div>
              </div>
            </div>

            {/* Pie con acciones */}
            <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/50 px-6 py-4">
              <button
                type="button"
                onClick={cerrarForm}
                disabled={guardando}
                className="rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="flex items-center gap-2 rounded-lg bg-ink px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98] disabled:opacity-50"
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