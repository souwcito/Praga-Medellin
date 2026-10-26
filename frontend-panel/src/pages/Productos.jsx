import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { codigosApi, productosApi } from '../services/api'
import {
  useCategorias,
  useColores,
  useEstilos,
  useMarcas,
  useSedes,
  useSubcategorias,
  useProductos,
} from '../hooks/useData'
import { categoriaTieneSubcategorias, tallasPara } from '../utils/catalogo'
import { codigoEtiquetaProducto, coincideCodigoEtiqueta, coincideCodigoExacto } from '../utils/codigoEtiqueta'
import { normalizarTallaPorNombre } from '../utils/tallas'
import { siguienteCodigo } from '../utils/codigos'
import { urlImagen } from '../utils/imagenes'
import MultiImageUpload from '../components/MultiImageUpload'
import Modal from '../components/Modal'
import {
  AlertIcon,
  CheckIcon,
  EditIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  StarIcon,
  TrashIcon,
  XIcon,
} from '../components/icons'

const StickerProductoModal = lazy(() => import('../components/StickerProductoModal'))
const StickerCategoriaModal = lazy(() => import('../components/StickerCategoriaModal'))
const ConfiguracionEtiquetasModal = lazy(() => import('../components/ConfiguracionEtiquetasModal'))

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

// Categoría → código de prenda (PRENDA del SKU). Las categorías que NO están
// aquí se manejan con SKU manual (Relojes, Mochos, Pantalonetas, Correas, etc.
// y el Jeans de hombre).
const PRENDA_POR_CATEGORIA = {
  // Hombre
  Gorras: 'GOR',
  Bolsos: 'BOL',
  Tenis: 'ZAP',
  Chanclas: 'CHA',
  Camisetas: 'CAM',
  Buzos: 'BUZ',
  Conjuntos: 'CON',
  Sudaderas: 'SUD',
  Perfumes: 'PER',
  // Mujer
  Blusas: 'BLU',
  Blusones: 'BLS',
  'Blusones cortos': 'BLC',
  Bodys: 'BOD',
  Sets: 'SET',
  'Faldas y shorts': 'FAL',
  Chaquetas: 'CHQ',
  Vestidos: 'VES',
  Camisas: 'CAM',
  Billeteras: 'BIL',
}

// Overrides por catálogo|nombre: categorías que se comportan distinto entre
// hombre y mujer. El Jeans de mujer usa SKU automático (JEA); el de hombre
// sigue con SKU manual.
const PRENDA_POR_CATALOGO_CATEGORIA = {
  'mujer|Jeans': 'JEA',
}

// Categorías donde el producto se puede marcar como "Unitalla" (una sola
// presentación, sin tallas). Hoy: Blusas y Bodys (catálogo mujer).
const CATEGORIAS_UNITALLA = ['Blusas', 'Bodys']

const CALIDADES = [
  { value: '1', label: '1 · Original' },
  { value: '2', label: '2 · Turca' },
  { value: '3', label: '3 · 1.1' },
]

// Modal para agregar una marca / color / estilo al vuelo desde el formulario.
function AltaCodigo({ titulo, codigo, nombre, setCodigo, setNombre, onGuardar, onClose, guardando, error, conPrenda, prenda, setPrenda }) {
  return (
    <Modal className="animate-fade-in z-[60] flex items-center justify-center bg-dark/70 p-4">
      <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6">
        <h3 className="mb-4 font-display text-lg font-semibold tracking-tight text-ink">
          Agregar {titulo}
        </h3>
        {error && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="space-y-3">
          {conPrenda && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-2">Prenda</span>
              <input type="text" value={prenda} onChange={(e) => setPrenda(e.target.value)} className={inputCls} />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-2">Código</span>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej. 06"
              autoFocus
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-2">Nombre</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Clemont"
              className={inputCls}
            />
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onGuardar}
            disabled={guardando}
            className="flex-1 rounded-lg bg-ink py-2.5 text-sm font-medium text-white hover:bg-metal-2 disabled:opacity-40"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  )
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

// Código de barras sugerido a partir del SKU y la talla: SKU-TALLA (p. ej.
// CAM0624353-M, CAM0624353-30) o SKU si es talla única (incluye gorras y
// tallas como Única/Unitalla). Así el código guardado coincide exactamente
// con el que se imprime en el sticker y con el que se escanea en el POS.
function barraPara(sku, talla, idx = 0) {
  const s = String(sku || '').trim()
  if (s) return codigoEtiquetaProducto({ sku: s, talla })
  return sugerirBarra(idx)
}

export default function Productos() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const catalogo = searchParams.get('catalogo') || ''
  const filtroCategoria = searchParams.get('categoria') || ''
  const filtroSubcategoria = searchParams.get('subcategoria') || ''

  const { data: categorias = [] } = useCategorias()
  const { data: subcategorias = [] } = useSubcategorias()
  const { data: sedes = [] } = useSedes()

  const params = useMemo(
    () => ({
      catalogo: catalogo || undefined,
      categoria_id: filtroCategoria || undefined,
      subcategoria_id: filtroSubcategoria || undefined,
    }),
    [catalogo, filtroCategoria, filtroSubcategoria],
  )
  const { data: productos = [], isLoading: loading, isError, error: errorRaw } = useProductos(params)
  const error =
    errorRaw?.message ||
    errorRaw?.error ||
    (isError ? 'No pudimos cargar los productos. Intenta de nuevo.' : null)

  const [busqueda, setBusqueda] = useState('')
  const [aviso, setAviso] = useState(null)

  const [form, setForm] = useState(null)
  const [campos, setCampos] = useState(CAMPOS_INICIALES)
  const [catalogoForm, setCatalogoForm] = useState('hombre')
  const [variantesForm, setVariantesForm] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState(null)

  // Sedes donde se aplica el stock inicial (null = todas; se define al abrir el form)
  const [sedesForm, setSedesForm] = useState(null)
  const sedesSeleccionadas = sedesForm ?? sedes.map((s) => s.id)
  function toggleSede(id) {
    setSedesForm((prev) => {
      const base = prev ?? sedes.map((s) => s.id)
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    })
  }
  function seleccionarTodasSedes() {
    setSedesForm(sedes.map((s) => s.id))
  }
  function limpiarSedes() {
    setSedesForm([])
  }

  const [modalDelete, setModalDelete] = useState(null)
  const [stickerProducto, setStickerProducto] = useState(null)
  const [imprimirCategoria, setImprimirCategoria] = useState(false)
  const [configEtiquetas, setConfigEtiquetas] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [portadaGuardando, setPortadaGuardando] = useState(null)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos

    // Si el texto es un código completo (V99, un código numérico o un
    // SKU-TALLA), se muestra solo la coincidencia exacta. Las coincidencias
    // parciales quedan para búsquedas por nombre o código incompleto.
    const exactos = productos.filter(
      (p) =>
        (p.sku || '').trim().toLowerCase() === q ||
        (p.variantes || []).some((v) =>
          coincideCodigoExacto({ ...v, sku: p.sku }, q),
        ),
    )
    if (exactos.length) return exactos

    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.variantes || []).some((v) => coincideCodigoEtiqueta(v, q)),
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
  const subcategoriaFormActual = subcategorias.find(
    (s) => s.id === Number(campos.subcategoria_id),
  )
  // Tenis y chanclas se guardan/muestran solo en USA. Si la talla viene en el
  // formato viejo (7-40) o con EUR (7-8/43-44), se normaliza antes de guardar.
  const contextoTallaForm = `${categoriaFormActual?.nombre || ''} ${
    subcategoriaFormActual?.nombre || ''
  }`
  const normalizarTallaForm = (talla) => normalizarTallaPorNombre(talla, contextoTallaForm)
  const normalizarTallaPara = (talla, catId, subId) => {
    const cat = categorias.find((c) => c.id === Number(catId))
    const sub = subcategorias.find((s) => s.id === Number(subId))
    return normalizarTallaPorNombre(talla, `${cat?.nombre || ''} ${sub?.nombre || ''}`)
  }
  const normalizarTallaOpcional = (talla) => {
    if (talla === null || talla === undefined || String(talla).trim() === '') return null
    return normalizarTallaForm(talla)
  }
  const normalizarTallaOpcionalPara = (talla, catId, subId) => {
    if (talla === null || talla === undefined || String(talla).trim() === '') return null
    return normalizarTallaPara(talla, catId, subId)
  }
  const prendaActual =
    PRENDA_POR_CATALOGO_CATEGORIA[`${catalogoForm}|${categoriaFormActual?.nombre}`] ||
    PRENDA_POR_CATEGORIA[categoriaFormActual?.nombre] ||
    null
  const esOpcionalTallas =
    Boolean(categoriaFormActual?.tallas_opcionales) ||
    CATEGORIAS_UNITALLA.includes(categoriaFormActual?.nombre)
  const usaTallas = variantesForm.some((v) => v.talla)

  // Catálogo de códigos para armar el SKU automático.
  const { data: marcas = [] } = useMarcas(catalogoForm)
  const { data: colores = [] } = useColores(catalogoForm)
  const { data: estilosPrenda = [] } = useEstilos(prendaActual, catalogoForm)
  const [codigo, setCodigo] = useState({ marcaId: '', estiloId: '', calidad: '', colorId: '' })
  const [alta, setAlta] = useState(null) // { tipo, codigo, nombre, prenda }
  const [altaGuardando, setAltaGuardando] = useState(false)
  const [altaError, setAltaError] = useState(null)

  // SKU = PRENDA + MARCA + ESTILO + CALIDAD + COLOR (todo pegado).
  const skuAuto = useMemo(() => {
    if (!prendaActual) return ''
    const m = marcas.find((x) => String(x.id) === String(codigo.marcaId))
    const e = estilosPrenda.find((x) => String(x.id) === String(codigo.estiloId))
    const c = colores.find((x) => String(x.id) === String(codigo.colorId))
    if (!m || !e || !codigo.calidad || !c) return ''
    return `${prendaActual}${m.codigo}${e.codigo}${codigo.calidad}${c.codigo}`
  }, [prendaActual, marcas, estilosPrenda, colores, codigo])

  // Al armar el SKU se pone en el campo y se generan los códigos de barras.
  useEffect(() => {
    if (!skuAuto) return
    setCampos((c) => ({ ...c, sku: skuAuto }))
    setVariantesForm((prev) =>
      prev.map((v, idx) => ({ ...v, codigo_barras: barraPara(skuAuto, v.talla, idx) })),
    )
  }, [skuAuto])

  // Nombre sugerido a partir del estilo + color (solo si el nombre está vacío).
  const estiloSel = estilosPrenda.find((x) => String(x.id) === String(codigo.estiloId))
  const colorSel = colores.find((x) => String(x.id) === String(codigo.colorId))
  useEffect(() => {
    if (!estiloSel) return
    setCampos((prev) =>
      prev.nombre
        ? prev
        : { ...prev, nombre: colorSel ? `${estiloSel.nombre} · ${colorSel.nombre}` : estiloSel.nombre },
    )
  }, [estiloSel, colorSel])

  async function guardarAlta() {
    if (!alta) return
    if (!String(alta.codigo).trim() || !String(alta.nombre).trim()) {
      setAltaError('Completa código y nombre.')
      return
    }
    setAltaGuardando(true)
    setAltaError(null)
    try {
      if (alta.tipo === 'marca') {
        const r = await codigosApi.createMarca({ codigo: alta.codigo.trim(), nombre: alta.nombre.trim(), catalogo: catalogoForm })
        await queryClient.invalidateQueries({ queryKey: ['marcas'] })
        setCodigo((c) => ({ ...c, marcaId: String(r.id) }))
      } else if (alta.tipo === 'color') {
        const r = await codigosApi.createColor({ codigo: alta.codigo.trim(), nombre: alta.nombre.trim(), catalogo: catalogoForm })
        await queryClient.invalidateQueries({ queryKey: ['colores'] })
        setCodigo((c) => ({ ...c, colorId: String(r.id) }))
      } else {
        const r = await codigosApi.createEstilo({
          prenda: alta.prenda,
          codigo: alta.codigo.trim(),
          nombre: alta.nombre.trim(),
          catalogo: catalogoForm,
        })
        await queryClient.invalidateQueries({ queryKey: ['estilos'] })
        setCodigo((c) => ({ ...c, estiloId: String(r.id) }))
      }
      setAlta(null)
    } catch (err) {
      setAltaError(err?.error || err?.message || 'No se pudo guardar')
    } finally {
      setAltaGuardando(false)
    }
  }

  function setUrlParam(clave, valor) {
    const next = new URLSearchParams(searchParams)
    if (valor) next.set(clave, String(valor))
    else next.delete(clave)
    setSearchParams(next, { replace: true })
  }

  function elegirCatalogo(valor) {
    setUrlParam('catalogo', valor)
    setUrlParam('categoria', '')
    setUrlParam('subcategoria', '')
  }

  function elegirCategoria(valor) {
    setUrlParam('categoria', valor)
    setUrlParam('subcategoria', '')
  }

  function elegirSubcategoria(valor) {
    setUrlParam('subcategoria', valor)
  }

  function construirVariantes(catId, subId, existentes = []) {
    // Al editar: se conservan las tallas reales del producto. El stock inicial
    // queda vacío (= no modifica el stock actual) y se muestra el total como referencia.
    if (existentes && existentes.length) {
      return existentes.map((ex, idx) => {
        const talla = normalizarTallaOpcionalPara(ex.talla, catId, subId)
        return {
          id: ex.id,
          talla,
          codigo_barras: ex.codigo_barras || barraPara(campos.sku, talla, idx),
          stock_inicial: '',
          stock_total: ex.stock_total ?? 0,
        }
      })
    }
    const cat = categorias.find((c) => c.id === Number(catId))
    // Categorías con tallas OPCIONALES (ej. gorras): por defecto talla única
    if (cat?.tallas_opcionales) {
      return [{ talla: null, codigo_barras: barraPara(campos.sku, null, 0), stock_inicial: '' }]
    }
    const tallas = tallasPara(catId, subId, categorias, subcategorias)
    const lista = tallas.length ? tallas : [null]
    return lista.map((t, idx) => {
      const talla = normalizarTallaOpcionalPara(t, catId, subId)
      return {
        talla,
        codigo_barras: barraPara(campos.sku, talla, idx),
        stock_inicial: '',
      }
    })
  }

  function construirConTallas(catId, subId) {
    const tallas = tallasPara(catId, subId, categorias, subcategorias)
    const lista = tallas.length ? tallas : [null]
    return lista.map((t, idx) => {
      const talla = normalizarTallaOpcionalPara(t, catId, subId)
      return {
        talla,
        codigo_barras: barraPara(campos.sku, talla, idx),
        stock_inicial: '',
      }
    })
  }

  function ponerTallaUnica() {
    setVariantesForm((prev) => [
      { talla: null, codigo_barras: barraPara(campos.sku, null, 0), stock_inicial: prev[0]?.stock_inicial ?? '' },
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
      { talla: '', codigo_barras: barraPara(campos.sku, null, prev.length), stock_inicial: '' },
    ])
  }

  function quitarTalla(idx) {
    setVariantesForm((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

  function abrirCrear() {
    setCampos({ ...CAMPOS_INICIALES })
    setCatalogoForm(catalogo || 'hombre')
    setVariantesForm([])
    setCodigo({ marcaId: '', estiloId: '', calidad: '', colorId: '' })
    setForm({})
    setSedesForm(null)
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
    setSedesForm(null)
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
    setCodigo((c) => ({ ...c, estiloId: '' }))
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

  // Al escribir el SKU se rellenan solos los códigos de barras (SKU-talla).
  function cambiarSku(valor) {
    setCampos((c) => ({ ...c, sku: valor }))
    const sku = String(valor || '').trim()
    setVariantesForm((prev) =>
      prev.map((v, idx) => ({ ...v, codigo_barras: barraPara(sku, v.talla, idx) })),
    )
  }

  // Al cambiar la talla, se recalcula el código de barras de esa variante.
  function cambiarTalla(idx, talla) {
    setVariantesForm((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return v
        const normalizada = normalizarTallaOpcional(talla)
        return {
          ...v,
          talla: normalizada,
          codigo_barras: barraPara(campos.sku, normalizada, idx),
        }
      }),
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
        sedes: sedesSeleccionadas,
        variantes: variantesForm.map((v) => ({
          id: v.id || undefined,
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
      queryClient.invalidateQueries({ queryKey: ['productos'] })
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
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      window.setTimeout(() => setAviso(null), 4000)
    } catch (err) {
      setAviso(err?.message || 'No se pudo eliminar el producto')
      window.setTimeout(() => setAviso(null), 4000)
    } finally {
      setEliminando(false)
    }
  }

  // id del producto que hoy es portada de una categoría (o undefined).
  function portadaDe(categoriaId) {
    return categorias.find((c) => c.id === Number(categoriaId))?.portada_producto_id
  }

  // Marca/desmarca este producto como portada de su categoría. Solo uno por
  // categoría: al marcar otro, el backend reemplaza el anterior.
  async function alternarPortada(p) {
    if (!p.categoria_id || !p.imagen_url || portadaGuardando) return
    const esPortada = portadaDe(p.categoria_id) === p.id
    setPortadaGuardando(p.id)
    try {
      await productosApi.setPortada(p.categoria_id, esPortada ? null : p.id)
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      setAviso(
        esPortada
          ? 'Se quitó la portada de la categoría.'
          : `"${p.nombre_interno || p.nombre}" es ahora la portada de la categoría.`,
      )
      window.setTimeout(() => setAviso(null), 4000)
    } catch (err) {
      setAviso(err?.message || 'No se pudo actualizar la portada')
      window.setTimeout(() => setAviso(null), 4000)
    } finally {
      setPortadaGuardando(null)
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

  const tituloCatalogo =
    catalogo === 'mujer'
      ? 'Catálogo Mujer'
      : catalogo === 'hombre'
        ? 'Catálogo Hombre'
        : catalogo === 'fragancia'
          ? 'Fragancias'
          : 'Productos'

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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setConfigEtiquetas(true)}
            className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink active:scale-[0.98]"
          >
            <PrinterIcon className="h-4 w-4" />
            Configurar etiquetas
          </button>
          <button
            type="button"
            onClick={() => setImprimirCategoria(true)}
            className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink active:scale-[0.98]"
          >
            <PrinterIcon className="h-4 w-4" />
            Imprimir categoría
          </button>
          <button
            type="button"
            onClick={abrirCrear}
            className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-metal-2 hover:shadow-lg hover:shadow-ink/20 active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo producto
          </button>
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
          <option value="fragancia">Catálogo Fragancias</option>
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
          <div className="grid grid-cols-[minmax(14rem,1fr)_6rem_6rem_8rem_6rem_4rem_9rem] items-center gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <span>Producto</span>
            <span>SKU</span>
            <span>Catálogo</span>
            <span>Categoría</span>
            <span className="text-right">Precio</span>
            <span className="text-center">Stock</span>
            <span className="text-right">Acciones</span>
          </div>

          <ul className="divide-y divide-line">
            {filtrados.map((p) => {
              const esPortada = portadaDe(p.categoria_id) === p.id
              const puedePortada = Boolean(p.categoria_id && p.imagen_url)
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-[minmax(14rem,1fr)_6rem_6rem_8rem_6rem_4rem_9rem] items-center gap-4 px-5 py-2.5 text-sm transition-colors hover:bg-surface-2/40"
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
                      onClick={() => alternarPortada(p)}
                      disabled={!puedePortada || portadaGuardando === p.id}
                      title={
                        !p.categoria_id
                          ? 'Asigna una categoría al producto'
                          : !p.imagen_url
                            ? 'El producto necesita una imagen'
                            : esPortada
                              ? 'Quitar como portada de la categoría'
                              : 'Usar como portada de la categoría'
                      }
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 ${
                        esPortada
                          ? 'text-amber-500 hover:bg-amber-50'
                          : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                      }`}
                    >
                      <StarIcon filled={esPortada} className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setStickerProducto(p)}
                      title="Imprimir stickers"
                      aria-label={`Imprimir stickers de ${p.nombre}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink active:scale-90"
                    >
                      <PrinterIcon className="h-4 w-4" />
                    </button>
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
              )
            })}
          </ul>
        </div>
      )}

      {/* Formulario crear/editar */}
      {form !== null && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
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
                        <span className="font-medium">Ofertas exclusivas</span>. Si lo dejas vacío, el
                        producto se vende a precio normal.
                      </p>

                      {prendaActual ? (
                        <div className="rounded-xl border border-line bg-surface-2/30 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                              Código del producto (automático)
                            </span>
                            <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] text-white">
                              {prendaActual}
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="flex gap-1">
                              <select
                                value={codigo.marcaId}
                                onChange={(e) => setCodigo({ ...codigo, marcaId: e.target.value })}
                                className={selectCls}
                              >
                                <option value="">Marca…</option>
                                {marcas.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.codigo} · {m.nombre}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  setAltaError(null)
                                  setAlta({ tipo: 'marca', codigo: siguienteCodigo(marcas.map((m) => m.codigo)), nombre: '' })
                                }}
                                title="Agregar marca"
                                className="flex w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink-2 transition-colors hover:border-ink hover:text-ink"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="flex gap-1">
                              <select
                                value={codigo.estiloId}
                                onChange={(e) => setCodigo({ ...codigo, estiloId: e.target.value })}
                                className={selectCls}
                              >
                                <option value="">Estilo…</option>
                                {estilosPrenda.map((es) => (
                                  <option key={es.id} value={es.id}>
                                    {es.codigo} · {es.nombre}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  setAltaError(null)
                                  setAlta({ tipo: 'estilo', prenda: prendaActual, codigo: siguienteCodigo(estilosPrenda.map((e) => e.codigo)), nombre: '' })
                                }}
                                title="Agregar estilo"
                                className="flex w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink-2 transition-colors hover:border-ink hover:text-ink"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>

                            <select
                              value={codigo.calidad}
                              onChange={(e) => setCodigo({ ...codigo, calidad: e.target.value })}
                              className={selectCls}
                            >
                              <option value="">Calidad…</option>
                              {CALIDADES.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>

                            <div className="flex gap-1">
                              <select
                                value={codigo.colorId}
                                onChange={(e) => setCodigo({ ...codigo, colorId: e.target.value })}
                                className={selectCls}
                              >
                                <option value="">Color…</option>
                                {colores.map((co) => (
                                  <option key={co.id} value={co.id}>
                                    {co.codigo} · {co.nombre}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  setAltaError(null)
                                  setAlta({ tipo: 'color', codigo: siguienteCodigo(colores.map((c) => c.codigo)), nombre: '' })
                                }}
                                title="Agregar color"
                                className="flex w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink-2 transition-colors hover:border-ink hover:text-ink"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-2">
                            <span className="text-xs text-ink-2">SKU</span>
                            <span className="font-mono text-sm font-semibold text-ink">
                              {campos.sku || '— completa los 4 —'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label htmlFor="p-sku" className="mb-1.5 block text-sm font-medium text-ink">
                            SKU
                          </label>
                          <input
                            id="p-sku"
                            type="text"
                            value={campos.sku}
                            onChange={(e) => cambiarSku(e.target.value)}
                            placeholder="Ej. JEA-REF-01"
                            className={inputCls}
                          />
                          <p className="mt-1 text-xs text-ink-2/70">
                            Esta categoría no tiene código automático: escribe el SKU a mano.
                          </p>
                        </div>
                      )}
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
                          <option value="fragancia">Fragancias</option>
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
                        ? 'Puedes marcarlo como Unitalla o usar tallas. El código de barras se llena solo con SKU-talla.'
                        : 'Se generan según la categoría: edita, quita o agrega las tallas que necesites. El código de barras se llena solo con SKU-talla.'
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
                                { valor: false, label: 'Unitalla' },
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
                                ? 'Unitalla'
                                : `${tallasActivas.length} tallas automáticas`}
                            </p>
                          )}

                          {sedes.length > 0 && (
                            <div className="mb-4 rounded-xl border border-line bg-surface-2/40 p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-semibold text-ink-2">
                                  Aplicar stock inicial a las sedes
                                </p>
                                <div className="flex items-center gap-3 text-[11px]">
                                  <button
                                    type="button"
                                    onClick={seleccionarTodasSedes}
                                    className="font-medium text-ink-2 underline underline-offset-2 transition-colors hover:text-ink"
                                  >
                                    Todas
                                  </button>
                                  <button
                                    type="button"
                                    onClick={limpiarSedes}
                                    className="font-medium text-ink-2 underline underline-offset-2 transition-colors hover:text-ink"
                                  >
                                    Ninguna
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                {sedes.map((s) => (
                                  <label
                                    key={s.id}
                                    className="flex items-center gap-2 text-sm font-medium text-ink"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={sedesSeleccionadas.includes(s.id)}
                                      onChange={() => toggleSede(s.id)}
                                      className="h-4 w-4 rounded border-line text-ink focus:ring-metal"
                                    />
                                    {s.nombre}
                                  </label>
                                ))}
                              </div>
                              <p className="mt-1.5 text-[11px] text-ink-2/70">
                                Las sedes no seleccionadas quedan en 0 (no mostrarán la talla en el POS).
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-[6rem_1fr_7rem_2rem] items-center gap-3 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
                            <span>Talla</span>
                            <span>Código de barras</span>
                            <span className="text-right">Stock inicial</span>
                            <span />
                          </div>

                          <div className="space-y-2">
                            {variantesForm.map((v, idx) => (
                              <div
                                key={idx}
                                className="grid grid-cols-[6rem_1fr_7rem_2rem] items-center gap-3"
                              >
                                <input
                                  type="text"
                                  value={v.talla || ''}
                                  onChange={(e) => cambiarTalla(idx, e.target.value || null)}
                                  placeholder="Unitalla"
                                  title="Talla (puedes editarla; vacío = Unitalla)"
                                  className={`${inputCls} text-center`}
                                />
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
                                  placeholder={form.id ? `Actual: ${v.stock_total ?? 0}` : '0'}
                                  title="Stock por sede (se aplica a las sedes seleccionadas). En edición: se SUMA al stock actual. Vacío = no modifica."
                                  className={`${inputCls} text-right`}
                                />
                                <button
                                  type="button"
                                  onClick={() => quitarTalla(idx)}
                                  disabled={variantesForm.length <= 1}
                                  title="Quitar talla"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/40 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {variantesForm.length > 0 && (
                            <button
                              type="button"
                              onClick={agregarTalla}
                              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink-2 transition-colors hover:text-ink"
                            >
                              <PlusIcon className="h-4 w-4" />
                              Agregar talla
                            </button>
                          )}

                          {variantesForm.length > 0 && (
                            <p className="mt-3 text-xs text-ink-2">
                              {form.id
                                ? 'El stock vacío = no modifica el stock actual. Si escribes un número, se SUMA al stock actual de las sedes seleccionadas.'
                                : 'El stock inicial se aplica a las sedes seleccionadas; vacío = comienza en 0.'}
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
                                {v.talla || 'Unitalla'}
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
        </Modal>
      )}

      {/* Confirmación de eliminación */}
      {modalDelete && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
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
        </Modal>
      )}

      {/* Alta rápida de marca / estilo / color desde el formulario */}
      {alta && (
        <AltaCodigo
          titulo={alta.tipo === 'marca' ? 'marca' : alta.tipo === 'estilo' ? 'estilo' : 'color'}
          codigo={alta.codigo}
          nombre={alta.nombre}
          setCodigo={(v) => setAlta((a) => (a ? { ...a, codigo: v } : a))}
          setNombre={(v) => setAlta((a) => (a ? { ...a, nombre: v } : a))}
          prenda={alta.prenda}
          setPrenda={(v) => setAlta((a) => (a ? { ...a, prenda: v } : a))}
          conPrenda={alta.tipo === 'estilo'}
          onGuardar={guardarAlta}
          onClose={() => setAlta(null)}
          guardando={altaGuardando}
          error={altaError}
        />
      )}

      {stickerProducto && (
        <Suspense fallback={null}>
          <StickerProductoModal
            producto={stickerProducto}
            onClose={() => setStickerProducto(null)}
          />
        </Suspense>
      )}

      {imprimirCategoria && (
        <Suspense fallback={null}>
          <StickerCategoriaModal
            categoriaInicial={filtroCategoria}
            subcategoriaInicial={filtroSubcategoria}
            onClose={() => setImprimirCategoria(false)}
          />
        </Suspense>
      )}

      {configEtiquetas && (
        <Suspense fallback={null}>
          <ConfiguracionEtiquetasModal onClose={() => setConfigEtiquetas(false)} />
        </Suspense>
      )}
    </div>
  )
}