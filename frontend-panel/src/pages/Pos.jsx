import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ventasApi } from '../services/api'
import { useSedes, useEmpleados, useInventarioSede, useInventarioCompleto } from '../hooks/useData'
import { Comprobante } from '../components/Comprobante'
import Modal from '../components/Modal'
import { imprimirComprobante } from '../utils/print'
import {
  buscarVariantePorCodigo,
  codigosVariante,
  coincideCodigoEtiqueta,
  normalizarCodigo,
  referenciaEtiquetaProducto,
} from '../utils/codigoEtiqueta'
import { normalizarTallaVisible } from '../utils/tallas'
import {
  AlertIcon,
  BoltIcon,
  CartIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  StoreIcon,
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
  'w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-sm placeholder:text-ink-2/50 transition-all duration-200 hover:border-ink-2/40 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

const FORMAS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'banco', label: 'Banco' },
  { value: 'addi', label: 'Addi' },
  { value: 'sistecredito', label: 'Sistecredito' },
  { value: 'bold', label: 'Bold' },
]

// Precio final por línea (si se puso un precio con descuento, usa ese; si no, el estándar)
const precioFinalItem = (item) =>
  item.precio_final != null && item.precio_final !== '' ? Number(item.precio_final) : item.precio
const descuentoLinea = (item) => (item.precio - precioFinalItem(item)) * item.cantidad

// Las líneas relámpago no tienen variante: se identifican por un uid local.
const esRelampago = (item) => item?.tipo === 'relampago'
const lineKey = (item) => (esRelampago(item) ? item.uid : item.variante_id)

// Tarjeta de producto (memoizada: el grid no se re-renderiza al escribir en el carrito)
// Al pasar el cursor sobre la foto aparece el botón "Ver fotos"; hay que hacer clic
// para abrir el visor. El resto de la tarjeta agrega al carrito.
const ProductoCard = memo(function ProductoCard({ v, i, onAgregar, onVer }) {
  const [mostrarBtn, setMostrarBtn] = useState(false)

  return (
    <div
      style={{ animationDelay: `${Math.min(i, 14) * 35}ms` }}
      className="animate-fade-up group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:border-metal hover:shadow-[0_12px_32px_-12px_rgba(10,10,10,0.18)]"
    >
      {/* Foto: el clic abre el visor de imágenes */}
      <button
        type="button"
        onClick={() => onVer(v)}
        onMouseEnter={() => setMostrarBtn(true)}
        onMouseLeave={() => setMostrarBtn(false)}
        onFocus={() => setMostrarBtn(true)}
        onBlur={() => setMostrarBtn(false)}
        title="Ver imágenes del producto"
        className="relative block aspect-square w-full cursor-zoom-in overflow-hidden bg-surface-2"
      >
        <img
          src={v.imagen_url}
          alt={v.nombre}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {v.stock <= 5 && (
          <span className="absolute right-2 top-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
            Quedan {v.stock}
          </span>
        )}
        {v.talla && (
          <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-white">
            {normalizarTallaVisible(v.talla)}
          </span>
        )}
        {v.imagenes?.length > 1 && (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-semibold text-white">
            {v.imagenes.length} fotos
          </span>
        )}
        {/* Botón que aparece al pasar el cursor: hay que hacerle clic */}
        {mostrarBtn && (
          <span className="animate-pop absolute inset-0 flex items-center justify-center bg-dark/25 backdrop-blur-[1px]">
            <span className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-white shadow-xl ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-105">
              <SearchIcon className="h-4 w-4" /> Ver fotos
            </span>
          </span>
        )}
      </button>

      {/* Info + agregar al carrito */}
      <button
        type="button"
        onClick={() => onAgregar(v)}
        className="flex flex-1 flex-col p-3 text-left transition-colors hover:bg-surface-2/40 active:bg-surface-2/60"
      >
        <p className="line-clamp-2 text-sm font-medium text-ink">{v.nombre}</p>
        <p className="mt-0.5 text-[11px] text-ink-2/70">
          Cód. {referenciaEtiquetaProducto(v)}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-sm font-bold text-ink">{formato(v.precio)}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white transition-all duration-200 group-hover:bg-metal group-active:scale-90">
            <PlusIcon className="h-4 w-4" />
          </span>
        </div>
      </button>
    </div>
  )
})

// Visor de imágenes: tarjeta grande centrada, con X, flechas y miniaturas.
function GaleriaModal({ data, onClose }) {
  const total = data.imagenes.length
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(data.index || 0, 0), Math.max(total - 1, 0)),
  )

  const anterior = useCallback(
    () => setIndex((i) => (i - 1 + total) % total),
    [total],
  )
  const siguiente = useCallback(() => setIndex((i) => (i + 1) % total), [total])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') anterior()
      else if (e.key === 'ArrowRight') siguiente()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [anterior, siguiente, onClose])

  return (
    <Modal
      className="animate-fade-in z-[60] flex items-center justify-center bg-dark/80 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Imágenes de ${data.nombre}`}
    >
      <div
        className="animate-scale-in flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{data.nombre}</p>
            <p className="text-xs text-ink-2">
              {total > 1 ? `Imagen ${index + 1} de ${total}` : 'Imagen del producto'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-surface-2 hover:text-ink active:scale-90"
            aria-label="Cerrar visor de imágenes"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Imagen grande + flechas */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-surface-2">
          <img
            src={data.imagenes[index]}
            alt={`${data.nombre} — imagen ${index + 1}`}
            className="max-h-[68vh] w-full object-contain"
          />

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={anterior}
                className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur transition-all duration-200 hover:bg-ink active:scale-90 sm:left-4"
                aria-label="Imagen anterior"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={siguiente}
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur transition-all duration-200 hover:bg-ink active:scale-90 sm:right-4"
                aria-label="Imagen siguiente"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>
            </>
          )}
        </div>

        {/* Miniaturas */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto border-t border-line bg-white px-4 py-3">
            {data.imagenes.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                  i === index
                    ? 'border-ink'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                aria-label={`Ver imagen ${i + 1}`}
              >
                <img
                  src={img}
                  alt={`${data.nombre} — miniatura ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function Pos() {
  const queryClient = useQueryClient()
  const { data: sedes = [] } = useSedes()
  const { data: empleados = [] } = useEmpleados()
  const [sedeId, setSedeId] = useState('')
  const [vendedorId, setVendedorId] = useState('')
  const [canal, setCanal] = useState('presencial')

  // Inventario de la sede con polling cada 20 s (React Query lo pausa si la
  // pestaña no es visible).
  const { data: variantes = [], isLoading: cargando, isError } = useInventarioSede(sedeId, {
    refetchInterval: 20000,
  })
  // Inventario completo (todas las sedes) solo para identificar un código que
  // no está en la sede actual. Así el escaneo dice "existe pero está en X" o
  // "no tiene stock", en vez de "no existe".
  const {
    data: inventarioCompleto = [],
    isLoading: cargandoCompleto,
    isError: errorCompleto,
  } = useInventarioCompleto()
  const [error, setError] = useState(null)
  const [avisoEscaneo, setAvisoEscaneo] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [cart, setCart] = useState([])
  const [confirmando, setConfirmando] = useState(false)

  // Venta relámpago: línea libre que no existe en inventario.
  const [relampagoAbierto, setRelampagoAbierto] = useState(false)
  const [relampagoForm, setRelampagoForm] = useState({
    nombre: '',
    precio: '',
    cantidad: '1',
    nota: '',
  })
  const [relampagoError, setRelampagoError] = useState(null)

  const [ventaResult, setVentaResult] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [resumenAbierto, setResumenAbierto] = useState(false)
  const [pagos, setPagos] = useState([])
  const [nota, setNota] = useState('')
  const [galeria, setGaleria] = useState(null)

  const searchRef = useRef(null)

  // Limpia el buscador visual y el estado. El input es no controlado para que
  // un lector de códigos rápido no pierda caracteres mientras React re-renderiza.
  const limpiarBusqueda = useCallback(() => {
    setBusqueda('')
    if (searchRef.current) searchRef.current.value = ''
  }, [])

  const agregar = useCallback((variante) => {
    setCart((prev) => {
      const existente = prev.find((i) => i.variante_id === variante.variante_id)
      if (existente) {
        if (existente.cantidad >= variante.stock) return prev
        return prev.map((i) =>
          i.variante_id === variante.variante_id ? { ...i, cantidad: i.cantidad + 1 } : i,
        )
      }
      return [...prev, { ...variante, cantidad: 1 }]
    })
    searchRef.current?.focus()
  }, [])

  // Resuelve un código escaneado contra la sede actual y, si no está, contra
  // todo el inventario para poder decir si existe, en qué sede está o si no
  // tiene stock. Así nunca responde "no existe" a un producto que sí existe.
  const resolverEscaneo = useCallback(
    (codigo) => {
      const enSede = buscarVariantePorCodigo(variantes, codigo)
      if (enSede) return { variante: enSede }

      const completo = buscarVariantePorCodigo(inventarioCompleto, codigo)
      if (!completo) {
        if (cargandoCompleto) {
          return {
            error: 'Estoy cargando el inventario completo. Escanea el código de nuevo en un segundo.',
          }
        }
        if (errorCompleto) {
          return {
            error: 'No pude consultar el inventario completo. Revisa la conexión e intenta de nuevo.',
          }
        }
        return {
          error: `El código ${codigo} no existe en el catálogo. Revisa la etiqueta o vuelve a imprimirla.`,
        }
      }

      const nombre = `${completo.nombre}${completo.talla ? ` · ${completo.talla}` : ''}`
      const stockActual = (completo.stock || []).find(
        (s) => Number(s.sede_id) === Number(sedeId),
      )
      const cantidadActual = Number(stockActual?.cantidad || 0)
      const sedesConStock = (completo.stock || []).filter(
        (s) => Number(s.cantidad) > 0,
      )
      const sedeActual = sedes.find((s) => s.id === Number(sedeId))?.nombre

      // Si la sede actual sí tiene stock pero el listado del POS aún no lo
      // refleja (caché de 20 s), se agrega usando el inventario completo.
      if (cantidadActual > 0) {
        return { variante: { ...completo, stock: cantidadActual } }
      }

      if (!sedeId) {
        return {
          error: `${nombre} existe. Selecciona la sede de la venta para venderlo.`,
        }
      }

      if (!sedesConStock.length) {
        return { error: `${nombre} existe, pero no tiene stock en ninguna sede.` }
      }

      return {
        error: `${nombre} no tiene stock en ${sedeActual || 'la sede seleccionada'}. Está en: ${sedesConStock
          .map((s) => s.sede)
          .join(', ')}.`,
      }
    },
    [variantes, inventarioCompleto, cargandoCompleto, errorCompleto, sedes, sedeId],
  )

  const procesarCodigo = useCallback(
    (codigo) => {
      const valor = String(codigo || '').trim()
      if (!valor) return false

      const resultado = resolverEscaneo(valor)
      if (resultado.variante) {
        agregar(resultado.variante)
        setAvisoEscaneo(null)
      } else {
        setAvisoEscaneo(resultado.error || 'No se encontró el código escaneado.')
      }
      limpiarBusqueda()
      return Boolean(resultado.variante)
    },
    [resolverEscaneo, agregar, limpiarBusqueda],
  )

  // Abre el visor grande con las imágenes del producto (o su principal si solo hay una).
  const verImagenes = useCallback((v) => {
    const imgs = v.imagenes && v.imagenes.length ? v.imagenes : v.imagen_url ? [v.imagen_url] : []
    if (!imgs.length) return
    setGaleria({ nombre: v.nombre, imagenes: imgs, index: 0 })
  }, [])

  // La búsqueda con useDeferredValue mantiene la UI fluida mientras se filtra
  const busquedaDeferred = useDeferredValue(busqueda)

  const variantesFiltradas = useMemo(() => {
    const q = busquedaDeferred.trim().toLowerCase()
    if (!q) return variantes

    // Un código escaneado debe llevar a la variante exacta, no a todas las que
    // contengan el texto (por ejemplo, SKU-9 frente a SKU-9.5).
    const qCodigo = normalizarCodigo(busquedaDeferred).toLowerCase()
    const exactas = qCodigo
      ? variantes.filter((v) =>
          codigosVariante(v).some((codigo) => codigo.toLowerCase() === qCodigo),
        )
      : []

    if (exactas.length > 0) return exactas

    return variantes.filter(
      (v) =>
        v.nombre.toLowerCase().includes(q) ||
        coincideCodigoEtiqueta(v, q) ||
        (v.talla || '').toLowerCase().includes(q),
    )
  }, [variantes, busquedaDeferred])

  // Captura el escáner aunque el foco no esté en el buscador (por ejemplo,
  // después de cerrar un modal o hacer clic en un botón). Si el foco está en
  // un campo de texto, deja que el input maneje el escaneo normalmente.
  useEffect(() => {
    let buffer = ''
    let timer = null

    const onKeyDown = (event) => {
      // No agregar productos mientras hay un modal abierto (resumen, recibo,
      // venta relámpago o galería): se evita sumar algo que el usuario no ve.
      if (modalAbierto || resumenAbierto || relampagoAbierto || galeria) return

      const el = event.target
      const escribiendo =
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable)
      if (escribiendo) return

      if (event.key === 'Enter') {
        const codigo = buffer
        buffer = ''
        if (codigo.length < 3) return
        event.preventDefault()
        procesarCodigo(codigo)
        return
      }

      if (event.key.length === 1) {
        buffer += event.key
        clearTimeout(timer)
        // Si pasa demasiado tiempo sin teclas, se descarta el buffer.
        timer = setTimeout(() => {
          buffer = ''
        }, 150)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearTimeout(timer)
    }
  }, [
    variantes,
    agregar,
    limpiarBusqueda,
    procesarCodigo,
    modalAbierto,
    resumenAbierto,
    relampagoAbierto,
    galeria,
  ])

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + precioFinalItem(i) * i.cantidad, 0),
    [cart],
  )

  const sumaPagos = useMemo(
    () => pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0),
    [pagos],
  )
  const pagosValidos = useMemo(
    () => pagos.some((p) => Number(p.monto) > 0) && sumaPagos === total,
    [pagos, sumaPagos, total],
  )

  const sedeNombre = sedes.find((s) => s.id === Number(sedeId))?.nombre
  const puedeConfirmar = Boolean(sedeId && vendedorId && cart.length > 0)

  function cambiarSede(e) {
    const value = e.target.value
    setSedeId(value)
    setError(null)
    setAvisoEscaneo(null)
    // Al cambiar de sede se limpia la venta: evita mezclar stock de sedes distintas
    setCart([])
    limpiarBusqueda()
    searchRef.current?.focus()
  }

  // El lector de códigos escribe el código y envía Enter: se agrega directo la
  // variante exacta (producto + talla) o se explica por qué no está disponible.
  function escanear(e) {
    if (e.key !== 'Enter') return
    const valor = e.currentTarget.value.trim()
    if (!valor) return
    // Si el usuario escribió una búsqueda con espacios (un nombre), Enter no
    // debe interpretarse como un código.
    if (/\s/.test(valor)) return
    e.preventDefault()
    procesarCodigo(valor)
  }

  function cambiarCantidad(key, cantidad) {
    setCart((prev) =>
      prev.map((i) => {
        if (lineKey(i) !== key) return i
        const max = esRelampago(i) ? Infinity : i.stock
        return { ...i, cantidad: Math.max(1, Math.min(max, cantidad)) }
      }),
    )
  }

  function eliminar(key) {
    setCart((prev) => prev.filter((i) => lineKey(i) !== key))
  }

  function cambiarPrecioFinal(key, value) {
    setCart((prev) =>
      prev.map((i) =>
        lineKey(i) === key
          ? {
              ...i,
              precio_final:
                value === '' ? '' : Math.max(1, Number(value) || 0),
            }
          : i,
      ),
    )
  }

  function abrirRelampago() {
    setRelampagoError(null)
    setRelampagoForm({ nombre: '', precio: '', cantidad: '1', nota: '' })
    setRelampagoAbierto(true)
  }

  function cerrarRelampago() {
    setRelampagoAbierto(false)
    setRelampagoError(null)
  }

  function agregarRelampago() {
    const nombre = relampagoForm.nombre.trim()
    const precio = Number(relampagoForm.precio)
    const cantidad = Math.max(1, parseInt(relampagoForm.cantidad, 10) || 1)

    if (!nombre) {
      setRelampagoError('Escribe el nombre o la descripción de lo vendido.')
      return
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      setRelampagoError('Escribe un valor unitario mayor a cero.')
      return
    }

    const uid = `relampago-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    setCart((prev) => [
      ...prev,
      {
        uid,
        tipo: 'relampago',
        variante_id: null,
        nombre,
        precio,
        precio_final: '',
        cantidad,
        nota: relampagoForm.nota.trim() || null,
        stock: null,
        imagen_url: null,
      },
    ])

    setRelampagoAbierto(false)
    setRelampagoError(null)
    searchRef.current?.focus()
  }

  function togglePago(metodo) {
    setPagos((prev) => {
      const existe = prev.some((p) => p.metodo_pago === metodo)
      if (existe) return prev.filter((p) => p.metodo_pago !== metodo)
      return [...prev, { metodo_pago: metodo, monto: '' }]
    })
  }

  function cambiarMonto(metodo, monto) {
    setPagos((prev) => prev.map((p) => (p.metodo_pago === metodo ? { ...p, monto } : p)))
  }

  // Primer paso: abre el resumen para revisar la venta antes de registrarla.
  function abrirResumen() {
    if (!puedeConfirmar) return
    setError(null)
    setPagos([{ metodo_pago: 'efectivo', monto: '' }])
    setNota('')
    setResumenAbierto(true)
  }

  async function confirmarVenta() {
    if (!puedeConfirmar || !pagosValidos) return
    setConfirmando(true)
    setError(null)
    try {
      const payload = {
        empleado_id: Number(vendedorId),
        sede_venta_id: Number(sedeId),
        tipo: canal,
        items: cart.map((i) =>
          esRelampago(i)
            ? {
                nombre: i.nombre,
                nota: i.nota || undefined,
                cantidad: i.cantidad,
                precio_unitario: i.precio,
                precio_final: precioFinalItem(i),
              }
            : {
                variante_id: i.variante_id,
                cantidad: i.cantidad,
                precio_unitario: i.precio,
                precio_final: precioFinalItem(i),
              },
        ),
        pagos: pagos.map((p) => ({ metodo_pago: p.metodo_pago, monto: Number(p.monto) || 0 })),
        nota: nota.trim() || null,
      }
      const result = await ventasApi.createVenta(payload)
      setVentaResult(result)
      setResumenAbierto(false)
      setModalAbierto(true)
      setCart([])
      limpiarBusqueda()
      setNota('')
      // Invalida el stock visible de la sede: se re-trae al instante
      queryClient.invalidateQueries({ queryKey: ['inventario', sedeId] })
    } catch (err) {
      setError(err?.error || err?.message || 'No se pudo registrar la venta')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div className="animate-fade-up mx-auto max-w-7xl">
      {/* Encabezado */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Punto de venta
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Busca por nombre, talla o código de barras y registra la venta.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-2" />
          {canal === 'virtual' ? 'Redes' : 'Punto físico'}
        </span>
      </div>

      {error && (
        <div className="animate-fade-in mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error || (isError ? 'No se pudo cargar el inventario de la sede' : '')}
        </div>
      )}

      {/* Selectores de venta */}
      <div className="mb-6 grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <StoreIcon className="h-4 w-4" /> Sede de la venta
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
                {v.rol === 'administrador' ? `${v.nombre} Administrador` : v.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <CartIcon className="h-4 w-4" /> Canal de la venta
          </span>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            className={selectCls}
          >
            <option value="presencial">Punto físico</option>
            <option value="virtual">Redes (Instagram / WhatsApp)</option>
          </select>
        </label>

        <div className="hidden sm:block lg:flex lg:flex-col lg:justify-end">
          <span className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
            Stock disponible
          </span>
          {sedeNombre ? (
            <p className="animate-fade-in text-sm font-medium text-ink" key={sedeId}>
              {sedeNombre}
            </p>
          ) : (
            <p className="text-sm text-ink-2/70">Elige la sede para ver su inventario.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        {/* Catálogo de variantes con stock en la sede */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
              Productos con stock
            </p>
            <button
              type="button"
              onClick={abrirRelampago}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition-colors hover:border-amber-400 hover:bg-amber-100 active:scale-[0.98]"
            >
              <BoltIcon className="h-4 w-4" />
              Venta relámpago
            </button>
          </div>

          <div className="relative mb-4">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2/60" />
            <input
              ref={searchRef}
              type="text"
              defaultValue=""
              onChange={(e) => {
                setBusqueda(e.target.value)
                if (avisoEscaneo) setAvisoEscaneo(null)
              }}
              onKeyDown={escanear}
              placeholder="Buscar por nombre, talla o código de barras… (el lector escribe y da Enter)"
              autoFocus
              className={inputCls}
            />
          </div>

          {avisoEscaneo && (
            <div className="animate-fade-in mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{avisoEscaneo}</span>
              <button
                type="button"
                onClick={() => setAvisoEscaneo(null)}
                aria-label="Cerrar aviso"
                className="shrink-0 rounded p-0.5 text-amber-700 transition-colors hover:bg-amber-100"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {cargando ? (
            <div className="grid h-64 place-items-center text-sm text-ink-2/70">
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
                Cargando inventario…
              </span>
            </div>
          ) : !sedeId ? (
            <div className="animate-fade-in grid h-64 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
              Selecciona una sede para cargar los productos disponibles.
            </div>
          ) : variantesFiltradas.length === 0 ? (
            <div className="animate-fade-in grid h-64 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
              {busqueda
                ? 'Sin resultados para esa búsqueda.'
                : 'Esta sede no tiene productos con stock.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {variantesFiltradas.map((v, i) => (
                <ProductoCard key={v.variante_id} v={v} i={i} onAgregar={agregar} onVer={verImagenes} />
              ))}
            </div>
          )}
        </section>

        {/* Carrito */}
        <aside className="flex h-[calc(100vh-16rem)] flex-col rounded-2xl border border-line bg-white xl:sticky xl:top-6">
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
                Venta actual
              </h2>
              <p className="text-xs text-ink-2/70">
                <span key={cart.length} className="inline-block animate-pop">
                  {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
                </span>
                {sedeNombre ? ` · ${sedeNombre}` : ''}
              </p>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs font-medium text-ink-2/70 transition-colors hover:text-red-700"
              >
                Vaciar
              </button>
            )}
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
                    <CartIcon className="h-7 w-7 text-ink-2/40" />
                  </div>
                  <p className="text-sm font-medium text-ink-2">Carrito vacío</p>
                  <p className="mt-1 text-xs text-ink-2/70">
                    Agrega productos desde el catálogo.
                  </p>
                </div>
              </div>
            ) : (
              cart.map((item) => {
                const flash = esRelampago(item)
                const key = lineKey(item)
                return (
                  <div
                    key={key}
                    className="animate-slide-right flex gap-3 rounded-xl border border-line p-2.5 transition-colors hover:bg-surface-2/60"
                  >
                    {flash ? (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                        <BoltIcon className="h-6 w-6" />
                      </span>
                    ) : (
                      <img
                        src={item.imagen_url}
                        alt={item.nombre}
                        className="h-14 w-14 shrink-0 rounded-lg bg-surface-2 object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                        <span className="truncate">{item.nombre}</span>
                        {flash && (
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            Relámpago
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-2/70">
                        {flash
                          ? 'Venta relámpago · sin stock'
                          : `${item.talla ? `Talla ${normalizarTallaVisible(item.talla)} · ` : ''}${formato(item.precio)} · stock ${item.stock}`}
                      </p>
                      {flash && item.nota && (
                        <p className="text-[11px] text-ink-2/70">{item.nota}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-line bg-white">
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(key, item.cantidad - 1)}
                            className="flex h-8 w-8 items-center justify-center text-ink-2 transition-colors hover:text-ink active:scale-90"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            value={item.cantidad}
                            min={1}
                            max={flash ? undefined : item.stock}
                            onChange={(e) =>
                              cambiarCantidad(key, parseInt(e.target.value, 10) || 1)
                            }
                            className="w-10 border-x border-line py-1 text-center text-sm font-semibold text-ink focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(key, item.cantidad + 1)}
                            disabled={!flash && item.cantidad >= item.stock}
                            className="flex h-8 w-8 items-center justify-center text-ink-2 transition-colors hover:text-ink active:scale-90 disabled:opacity-30"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminar(key)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/40 transition-colors hover:bg-red-50 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                          Precio final
                          <input
                            type="number"
                            min={1}
                            value={item.precio_final ?? ''}
                            onChange={(e) => cambiarPrecioFinal(key, e.target.value)}
                            placeholder={formato(item.precio)}
                            title="Precio al que se vende (vacío = precio estándar)"
                            className="w-24 rounded-lg border border-line bg-white px-2 py-1 text-right text-xs font-medium text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                          />
                        </label>
                        {descuentoLinea(item) > 0 && (
                          <span className="text-[11px] font-semibold text-emerald-700">
                            −{formato(descuentoLinea(item))}
                          </span>
                        )}
                        {descuentoLinea(item) < 0 && (
                          <span className="text-[11px] font-semibold text-amber-700">
                            +{formato(-descuentoLinea(item))}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-right text-sm font-semibold text-ink">
                        {formato(precioFinalItem(item) * item.cantidad)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <footer className="border-t border-line p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-ink-2">Total</span>
              <span key={total} className="animate-pop text-2xl font-bold text-ink">
                {formato(total)}
              </span>
            </div>
            <button
              type="button"
              onClick={abrirResumen}
              disabled={!puedeConfirmar}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:bg-metal-2 hover:shadow-lg hover:shadow-ink/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckIcon className="h-5 w-5" />
              Confirmar venta
            </button>
          </footer>
        </aside>
      </div>

      {/* Resumen previo a registrar la venta (el stock se descuenta al confirmar aquí) */}
      {resumenAbierto && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center overflow-y-auto bg-dark/70 p-4">
          <div className="animate-scale-in flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                  Revisa la venta
                </h3>
                <p className="text-xs text-ink-2/70">
                  Confirma los datos antes de registrar la venta y descontar el stock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResumenAbierto(false)}
                disabled={confirmando}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <dl className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">Sede</dt>
                  <dd className="font-medium text-ink">{sedeNombre || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">Vendedor</dt>
                  <dd className="font-medium text-ink">
                    {empleados.find((e) => e.id === Number(vendedorId))?.nombre || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">Canal</dt>
                  <dd className="font-medium text-ink">
                    {canal === 'virtual' ? 'Redes' : 'Punto físico'}
                  </dd>
                </div>
              </dl>

              <ul className="space-y-2 border-t border-line pt-3">
                {cart.map((item) => {
                  const flash = esRelampago(item)
                  return (
                    <li key={lineKey(item)} className="flex items-center gap-3 text-sm">
                      {flash ? (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                          <BoltIcon className="h-5 w-5" />
                        </span>
                      ) : (
                        <img
                          src={item.imagen_url}
                          alt={item.nombre}
                          className="h-10 w-10 shrink-0 rounded-lg bg-surface-2 object-cover"
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate text-ink">
                        {item.nombre}
                        {item.talla ? <span className="text-ink-2"> · {normalizarTallaVisible(item.talla)}</span> : null}
                        {flash && (
                          <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            · Relámpago
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-ink-2">
                        {item.cantidad} × {formato(precioFinalItem(item))}
                      </span>
                      <span className="w-20 shrink-0 text-right font-semibold text-ink">
                        {formato(precioFinalItem(item) * item.cantidad)}
                      </span>
                    </li>
                  )
                })}
              </ul>

              {/* Formas de pago (una o varias; la suma debe ser el total) */}
              <div className="mt-4 border-t border-line pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">Forma(s) de pago</p>
                  <span
                    className={`text-xs font-semibold ${
                      pagosValidos ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {pagosValidos
                      ? 'Pago completo'
                      : total - sumaPagos > 0
                        ? `Falta ${formato(total - sumaPagos)}`
                        : `Excede ${formato(sumaPagos - total)}`}
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
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
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
                          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-right text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nota interna (opcional) */}
              <div className="mt-4 border-t border-line pt-4">
                <label htmlFor="nota-venta" className="mb-1.5 block text-sm font-semibold text-ink">
                  Nota (opcional)
                </label>
                <textarea
                  id="nota-venta"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Ej. queda pendiente un cambio…"
                  className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line px-6 py-4">
              <span className="text-sm text-ink-2">Total</span>
              <span className="text-2xl font-bold text-ink">{formato(total)}</span>
            </div>

            <div className="flex gap-2 border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={() => setResumenAbierto(false)}
                disabled={confirmando}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmarVenta}
                disabled={!pagosValidos || confirmando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {confirmando ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Registrando…
                  </span>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Confirmar venta
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: venta relámpago (producto que no está en inventario) */}
      {relampagoAbierto && (
        <Modal className="animate-fade-in z-[60] flex items-center justify-center overflow-y-auto bg-dark/70 p-4">
          <div className="animate-scale-in w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <BoltIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                    Venta relámpago
                  </h3>
                  <p className="text-xs text-ink-2">
                    Producto que no está en inventario. No descuenta stock.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cerrarRelampago}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-2/70 hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {relampagoError && (
              <p className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertIcon className="h-4 w-4 shrink-0" />
                {relampagoError}
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                agregarRelampago()
              }}
              className="space-y-3"
            >
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Nombre o descripción
                </span>
                <input
                  type="text"
                  value={relampagoForm.nombre}
                  onChange={(e) =>
                    setRelampagoForm((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  placeholder="Ej. Camisa importada azul"
                  autoFocus
                  maxLength={255}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                    Valor unitario
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={relampagoForm.precio}
                    onChange={(e) =>
                      setRelampagoForm((prev) => ({ ...prev, precio: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-right text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                    Cantidad
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={relampagoForm.cantidad}
                    onChange={(e) =>
                      setRelampagoForm((prev) => ({ ...prev, cantidad: e.target.value }))
                    }
                    className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-center text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Notas <span className="normal-case text-ink-2/60">(opcional)</span>
                </span>
                <textarea
                  value={relampagoForm.nota}
                  onChange={(e) =>
                    setRelampagoForm((prev) => ({ ...prev, nota: e.target.value }))
                  }
                  rows={2}
                  maxLength={500}
                  placeholder="Detalle, color, procedencia…"
                  className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                />
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={cerrarRelampago}
                  className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-semibold text-white transition-colors hover:bg-metal-2 active:scale-[0.98]"
                >
                  <PlusIcon className="h-4 w-4" />
                  Agregar a la venta
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Modal de comprobante tras confirmar */}
      {modalAbierto && ventaResult && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center overflow-y-auto bg-dark/70 p-4">
          <div className="animate-scale-in flex max-h-[92vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
                  <CheckIcon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                  Venta registrada
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <Comprobante data={ventaResult} />
            </div>

            <div className="flex gap-2 border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 active:scale-[0.98]"
              >
                Seguir facturando
              </button>
              <button
                type="button"
                onClick={() => imprimirComprobante(ventaResult)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-metal-2 active:scale-[0.98]"
              >
                <PrinterIcon className="h-4 w-4" />
                Imprimir
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Visor grande de imágenes del producto */}
      {galeria && <GaleriaModal data={galeria} onClose={() => setGaleria(null)} />}
    </div>
  )
}