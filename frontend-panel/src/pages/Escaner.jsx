import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProductImage from '../components/ProductImage'
import { AlertIcon, CheckIcon, ScanIcon, XIcon } from '../components/icons'
import {
  useCategorias,
  useInventarioCompleto,
  useSubcategorias,
} from '../hooks/useData'
import { ordenarTallas } from '../utils/catalogo'
import {
  buscarVariantePorCodigo,
  referenciaEtiquetaProducto,
} from '../utils/codigoEtiqueta'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

// Tiempo máximo entre teclas para considerar que todo viene del lector.
// Si el lector no envía Enter, al terminar la ráfaga se procesa solo.
const TIEMPO_BUFFER_MS = 250
const MAX_HISTORIAL = 8

function etiquetaTalla(talla) {
  const texto = String(talla ?? '').trim()
  return texto || 'Unitalla'
}

function horaCorta(ms) {
  return new Date(ms).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// La foto principal se muestra completa (sin recortar la silueta del producto)
// y con un respaldo si la imagen no existe o falla.
function FotoGrande({ src, alt }) {
  const [rota, setRota] = useState(false)

  if (!src || rota) {
    return (
      <div className="flex h-full min-h-[260px] w-full items-center justify-center text-ink-2/20">
        <ScanIcon className="h-24 w-24" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setRota(true)}
      className="max-h-[62vh] w-full object-contain"
    />
  )
}

export default function Escaner() {
  const {
    data: inventario = [],
    isLoading,
    isError,
    error: errorRaw,
    refetch,
  } = useInventarioCompleto({ refetchInterval: 20000 })
  const { data: categorias = [] } = useCategorias()
  const { data: subcategorias = [] } = useSubcategorias()

  const [resultado, setResultado] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [ultimoCodigo, setUltimoCodigo] = useState('')
  const [historial, setHistorial] = useState([])
  const [flash, setFlash] = useState('idle')
  const [escaneando, setEscaneando] = useState(false)

  const bufferRef = useRef('')
  const timerRef = useRef(null)
  const flashTimerRef = useRef(null)

  // Si falla una actualización en segundo plano pero ya hay datos cargados, el
  // escáner sigue funcionando con la última copia del inventario.
  const sinInventario = isError && inventario.length === 0

  const mostrarFlash = useCallback((tipo) => {
    setFlash(tipo)
    clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlash('idle'), 1200)
  }, [])

  // Busca la variante exacta con el código escaneado. Al no depender de un
  // input, la página queda escuchando y el siguiente escaneo reemplaza el
  // resultado automáticamente.
  const procesar = useCallback(
    (codigoCrudo) => {
      const codigo = String(codigoCrudo || '').trim()
      if (!codigo) return

      setUltimoCodigo(codigo)

      // Mientras carga o si no hay inventario, el aviso superior ya explica el
      // estado; se evita mostrar un "código no encontrado" equivocado.
      if (isLoading || sinInventario) return

      const encontrada = buscarVariantePorCodigo(inventario, codigo)

      if (!encontrada) {
        setResultado(null)
        setAviso(`No encontré ningún producto con el código “${codigo}”. Revisa la etiqueta o vuelve a imprimirla.`)
        mostrarFlash('error')
        return
      }

      setAviso(null)
      setResultado(encontrada)
      mostrarFlash('ok')
      setHistorial((prev) => {
        const entrada = {
          ...encontrada,
          codigo,
          escaneadoEn: Date.now(),
        }
        return [
          entrada,
          ...prev.filter(
            (item) => item.variante_id !== encontrada.variante_id || item.codigo !== codigo,
          ),
        ].slice(0, MAX_HISTORIAL)
      })
    },
    [inventario, isLoading, sinInventario, mostrarFlash],
  )

  // El lector se comporta como un teclado: escribe el código y termina con
  // Enter (o Tab). Se captura a nivel de ventana para que no haya que enfocar
  // ningún campo antes de cada producto.
  useEffect(() => {
    const onKeyDown = (event) => {
      const el = event.target
      if (
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return
      }

      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return

      if (event.key === 'Enter' || event.key === 'Tab') {
        const codigo = bufferRef.current
        if (!codigo) return
        bufferRef.current = ''
        clearTimeout(timerRef.current)
        event.preventDefault()
        setEscaneando(false)
        procesar(codigo)
        return
      }

      if (event.key.length === 1) {
        bufferRef.current += event.key
        setEscaneando(true)
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          const codigo = bufferRef.current
          bufferRef.current = ''
          setEscaneando(false)
          // Respaldo para lectores configurados sin sufijo Enter/Tab.
          if (codigo.length >= 2) procesar(codigo)
        }, TIEMPO_BUFFER_MS)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [procesar])

  // Limpia los temporizadores al salir de la página.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
      clearTimeout(flashTimerRef.current)
    },
    [],
  )

  const limpiar = useCallback(() => {
    bufferRef.current = ''
    clearTimeout(timerRef.current)
    clearTimeout(flashTimerRef.current)
    setResultado(null)
    setAviso(null)
    setUltimoCodigo('')
    setHistorial([])
    setFlash('idle')
    setEscaneando(false)
  }, [])

  const stockTotal = (resultado?.stock || []).reduce(
    (total, sede) => total + Number(sede.cantidad || 0),
    0,
  )

  // Si el backend todavía no envía el precio en el inventario completo, se
  // muestra un guion en vez de un $0 engañoso.
  const precioTexto =
    resultado?.precio === null || resultado?.precio === undefined
      ? '—'
      : formatoCOP.format(Number(resultado.precio) || 0)

  const nombreCategoria =
    categorias.find((categoria) => categoria.id === resultado?.categoria_id)?.nombre || ''
  const nombreSubcategoria =
    subcategorias.find((subcategoria) => subcategoria.id === resultado?.subcategoria_id)?.nombre || ''
  const catalogoLabel =
    resultado?.catalogo === 'hombre'
      ? 'Hombre'
      : resultado?.catalogo === 'mujer'
        ? 'Mujer'
        : ''

  // Tallas del mismo producto y stock total de cada una. Sirve para confirmar
  // de un vistazo qué otras tallas existen, sin salir del escáner.
  const tallasProducto = useMemo(() => {
    if (!resultado) return []
    const delProducto = inventario.filter(
      (variante) => variante.producto_id === resultado.producto_id,
    )
    const tallas = [...new Set(delProducto.map((variante) => variante.talla ?? ''))]

    return ordenarTallas(tallas).map((talla) => {
      const stock = delProducto
        .filter((variante) => (variante.talla ?? '') === talla)
        .reduce(
          (total, variante) =>
            total +
            (variante.stock || []).reduce(
              (suma, sede) => suma + Number(sede.cantidad || 0),
              0,
            ),
          0,
        )
      return { talla, stock }
    })
  }, [inventario, resultado])

  const estado = sinInventario
    ? {
        texto: 'Sin conexión',
        clases: 'border-red-200 bg-red-50 text-red-700',
        punto: 'bg-red-500',
      }
    : isLoading
      ? {
          texto: 'Cargando catálogo',
          clases: 'border-amber-200 bg-amber-50 text-amber-800',
          punto: 'animate-pulse bg-amber-500',
        }
      : escaneando
        ? {
            texto: 'Leyendo código…',
            clases: 'border-amber-200 bg-amber-50 text-amber-800',
            punto: 'animate-pulse bg-amber-500',
          }
        : flash === 'ok'
          ? {
              texto: 'Producto encontrado',
              clases: 'border-emerald-200 bg-emerald-50 text-emerald-800',
              punto: 'bg-emerald-500',
            }
          : flash === 'error'
            ? {
                texto: 'Código no encontrado',
                clases: 'border-red-200 bg-red-50 text-red-700',
                punto: 'bg-red-500',
              }
            : {
                texto: 'Escáner listo',
                clases: 'border-emerald-200 bg-emerald-50 text-emerald-800',
                punto: 'animate-pulse bg-emerald-500',
              }

  const hayAlgoQueLimpiar = Boolean(resultado || aviso || ultimoCodigo || historial.length)

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-2/45">
            Herramienta de inventario
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
            Escáner de productos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-2/70">
            Escanea un código de barras y verás el producto con su foto grande.
            No tienes que enfocar ningún buscador: al leer un código, la página
            queda lista para el siguiente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${estado.clases}`}
            aria-live="polite"
          >
            <span className={`h-2 w-2 rounded-full ${estado.punto}`} />
            {estado.texto}
          </div>
          <button
            type="button"
            onClick={limpiar}
            disabled={!hayAlgoQueLimpiar}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <XIcon className="h-3.5 w-3.5" />
            Limpiar
          </button>
        </div>
      </div>

      <div aria-live="polite">
        {sinInventario ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-700">
              <AlertIcon className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold text-red-950">
              No pude cargar el inventario
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-red-800">
              {errorRaw?.message || errorRaw?.error || 'Revisa la conexión e intenta de nuevo.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800"
            >
              Reintentar
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid min-h-[420px] place-items-center rounded-3xl border border-line bg-white">
            <div className="text-center">
              <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-ink-2/20 border-t-ink" />
              <p className="mt-3 text-sm text-ink-2/60">
                Cargando el catálogo para escanear…
              </p>
            </div>
          </div>
        ) : aviso ? (
          <div className="animate-fade-in rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertIcon className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold text-amber-950">
              Código no encontrado
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">{aviso}</p>
            <p className="mt-4 text-xs font-medium text-amber-700">
              El escáner sigue activo. Escanea el siguiente código.
            </p>
          </div>
        ) : resultado ? (
          <article
            key={resultado.variante_id}
            className="animate-fade-in grid overflow-hidden rounded-3xl border border-line bg-white shadow-sm lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]"
          >
            <div className="relative flex min-h-[320px] items-center justify-center bg-surface-2/50 p-5 sm:min-h-[420px] sm:p-8 lg:min-h-[560px]">
              <FotoGrande
                key={resultado.imagen_url || 'sin-imagen'}
                src={resultado.imagen_url}
                alt={resultado.nombre}
              />

              <span className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-2 shadow-sm backdrop-blur">
                {nombreCategoria || 'Producto'}
                {nombreSubcategoria ? ` · ${nombreSubcategoria}` : ''}
              </span>

              {stockTotal === 0 && (
                <span className="absolute right-4 top-4 rounded-full bg-red-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                  Sin stock
                </span>
              )}
            </div>

            <div className="flex flex-col p-5 sm:p-7 lg:p-9">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  <CheckIcon className="h-3.5 w-3.5" />
                  Encontrado
                </span>
                {catalogoLabel && (
                  <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-2/60">
                    {catalogoLabel}
                  </span>
                )}
              </div>

              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
                {resultado.nombre}
              </h2>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white">
                  Talla {etiquetaTalla(resultado.talla)}
                </span>
                <span className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-2">
                  SKU {resultado.sku || '—'}
                </span>
              </div>

              <div className="mt-5 flex items-end justify-between gap-4 border-y border-line py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-2/45">
                    Precio
                  </p>
                  <p className="mt-0.5 text-2xl font-semibold text-ink">
                    {precioTexto}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-2/45">
                    Stock total
                  </p>
                  <p
                    className={`mt-0.5 text-2xl font-semibold ${
                      stockTotal > 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {stockTotal}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-2/45">
                  Stock por sede
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(resultado.stock || []).map((sede) => {
                    const cantidad = Number(sede.cantidad || 0)
                    return (
                      <div
                        key={sede.sede_id}
                        className={`rounded-xl border px-3 py-2 ${
                          cantidad > 0
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-line bg-white'
                        }`}
                      >
                        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-ink-2/55">
                          {sede.sede}
                        </p>
                        <p
                          className={`mt-0.5 text-lg font-semibold ${
                            cantidad > 0 ? 'text-emerald-700' : 'text-ink-2/35'
                          }`}
                        >
                          {cantidad}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {tallasProducto.length > 1 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-2/45">
                      Tallas del producto
                    </p>
                    <p className="text-[10px] text-ink-2/40">Stock total por talla</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tallasProducto.map((item) => {
                      const activa =
                        (item.talla ?? '') === (resultado.talla ?? '')
                      return (
                        <span
                          key={item.talla || 'unica'}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                            activa
                              ? 'border-ink bg-ink text-white'
                              : 'border-line bg-white text-ink-2'
                          } ${item.stock === 0 ? 'opacity-45' : ''}`}
                        >
                          {etiquetaTalla(item.talla)}
                          <span
                            className={`text-[10px] ${
                              activa ? 'text-white/70' : 'text-ink-2/50'
                            }`}
                          >
                            {item.stock}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6">
                <div className="rounded-xl bg-surface-2/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-2/45">
                    Código escaneado
                  </p>
                  <p className="mt-0.5 break-all font-mono text-sm font-semibold text-ink">
                    {ultimoCodigo}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-2/55">
                    Referencia: {referenciaEtiquetaProducto(resultado)}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ) : (
          <div className="grid min-h-[420px] place-items-center rounded-3xl border-2 border-dashed border-line bg-surface-2/30 p-8 text-center">
            <div className="max-w-xl">
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-line">
                <ScanIcon className="h-12 w-12 text-ink" />
                <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-pulse rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold text-ink">
                Listo para escanear
              </h2>
              <p className="mt-2 text-sm text-ink-2/70">
                Apunta el lector al código de barras. Al terminar un escaneo, la
                página se queda escuchando para el siguiente; no necesitas
                buscar ni enfocar nada.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 text-[11px] font-medium text-ink-2/60">
                <span className="rounded-full border border-line bg-white px-3 py-1">
                  V123
                </span>
                <span className="rounded-full border border-line bg-white px-3 py-1">
                  Código numérico
                </span>
                <span className="rounded-full border border-line bg-white px-3 py-1">
                  SKU-TALLA
                </span>
              </div>
              <p className="mt-4 text-[11px] text-ink-2/40">
                Si el lector no responde, haz clic una vez sobre la página para
                darle el foco a la ventana.
              </p>
            </div>
          </div>
        )}
      </div>

      {historial.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Últimos escaneos</h2>
            <button
              type="button"
              onClick={() => setHistorial([])}
              className="text-xs font-medium text-ink-2/50 transition-colors hover:text-ink"
            >
              Limpiar historial
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {historial.map((item) => (
              <button
                key={`${item.variante_id}-${item.escaneadoEn}`}
                type="button"
                onClick={() => {
                  setResultado(item)
                  setAviso(null)
                  setUltimoCodigo(item.codigo)
                }}
                className="group flex items-center gap-3 rounded-xl border border-line bg-white p-2.5 text-left transition-colors hover:border-metal/50 hover:bg-surface-2/40"
              >
                <ProductImage
                  src={item.imagen_url}
                  alt={item.nombre}
                  className="h-14 w-14 rounded-lg"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-ink">
                    {item.nombre}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-ink-2/60">
                    Talla {etiquetaTalla(item.talla)} · {item.codigo}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] text-ink-2/40">
                  {horaCorta(item.escaneadoEn)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
