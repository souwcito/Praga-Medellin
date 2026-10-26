import { useMemo, useState } from 'react'
import Modal from './Modal'
import StickerSheetPreview from './StickerSheetPreview'
import {
  useCategorias,
  useConfiguracionEtiquetas,
  useSedes,
  useStickersCategoria,
  useSubcategorias,
} from '../hooks/useData'
import { ordenarTallas } from '../utils/catalogo'
import { urlImagen } from '../utils/imagenes'
import { normalizarTallaVisible } from '../utils/tallas'
import {
  DEFAULT_CONFIG,
  crearStickersProducto,
  etiquetaSede,
  imprimirGuiaStickers,
  imprimirStickers,
  normalizarConfig,
} from '../utils/stickers'
import { AlertIcon, PrinterIcon, XIcon } from './icons'

export default function StickerCategoriaModal({
  categoriaInicial = '',
  subcategoriaInicial = '',
  onClose,
}) {
  const { data: categorias = [] } = useCategorias()
  const { data: subcategorias = [] } = useSubcategorias()
  const { data: sedes = [] } = useSedes()
  const { data: configData } = useConfiguracionEtiquetas()
  const config = normalizarConfig(configData || DEFAULT_CONFIG)

  const [categoriaId, setCategoriaId] = useState(
    categoriaInicial ? String(categoriaInicial) : '',
  )
  const [subcategoriaId, setSubcategoriaId] = useState(
    subcategoriaInicial ? String(subcategoriaInicial) : '',
  )
  const [sedeId, setSedeId] = useState('')
  const [excluidos, setExcluidos] = useState(() => new Set())
  const [tallasExcluidas, setTallasExcluidas] = useState(() => new Set())
  const [errorImpresion, setErrorImpresion] = useState(null)

  const parametros = useMemo(
    () => ({
      categoria_id: categoriaId || undefined,
      subcategoria_id: subcategoriaId || undefined,
    }),
    [categoriaId, subcategoriaId],
  )

  const { data, isLoading, isError, error: errorRaw, refetch } = useStickersCategoria(
    parametros,
    { enabled: Boolean(categoriaId) },
  )

  const opcionesSedes = data?.sedes || sedes
  const sedeSel = opcionesSedes.find((s) => String(s.id) === String(sedeId))
  const categoriaSel = categorias.find((c) => String(c.id) === String(categoriaId))
  const nombreCategoria = data?.categoria?.nombre || categoriaSel?.nombre || 'Categoría'

  const subcategoriasFiltro = subcategorias.filter(
    (s) => String(s.categoria_id) === String(categoriaId),
  )

  const cantidadEnSede = (variante, sede = sedeSel) => {
    if (!sede) return 0
    return Number(
      variante.stock?.find((s) => String(s.sede_id) === String(sede.id))?.cantidad || 0,
    )
  }

  const variantesConStock = (producto) =>
    (producto.variantes || []).filter((v) => cantidadEnSede(v) > 0)

  const tallaEtiqueta = (variante) => normalizarTallaVisible(variante.talla) || 'Unitalla'

  // Tallas disponibles en la sede para esta categoría. El filtro de tallas
  // excluye las que no se quieran imprimir.
  const tallasDisponibles = useMemo(() => {
    if (!sedeSel) return []
    const set = new Set()
    ;(data?.productos || []).forEach((producto) => {
      ;(producto.variantes || []).forEach((variante) => {
        if (cantidadEnSede(variante) > 0) set.add(tallaEtiqueta(variante))
      })
    })
    return ordenarTallas([...set])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sedeId])

  const tieneCodigo = (producto, variante) =>
    Boolean(String(producto?.sku || '').trim() || String(variante?.codigo_barras || '').trim())

  const variantesImprimibles = (producto) =>
    variantesConStock(producto)
      .filter((v) => tieneCodigo(producto, v))
      .filter((v) => !tallasExcluidas.has(tallaEtiqueta(v)))

  const totalProducto = (producto) =>
    variantesImprimibles(producto).reduce(
      (suma, variante) => suma + cantidadEnSede(variante),
      0,
    )

  const productosConStock = (data?.productos || []).filter(
    (producto) => variantesConStock(producto).length > 0,
  )
  // Productos que tienen al menos una talla activa en el filtro.
  const productosVisibles = productosConStock.filter((producto) =>
    variantesConStock(producto).some(
      (variante) => !tallasExcluidas.has(tallaEtiqueta(variante)),
    ),
  )
  const productosImprimibles = productosVisibles.filter(
    (producto) => totalProducto(producto) > 0,
  )
  const sinCodigo = productosVisibles.filter((producto) =>
    variantesConStock(producto).some(
      (v) => !tallasExcluidas.has(tallaEtiqueta(v)) && !tieneCodigo(producto, v),
    ),
  )
  const sinStock = (data?.productos || []).length - productosConStock.length
  const seleccionados = productosImprimibles.filter(
    (producto) => !excluidos.has(producto.id),
  )

  const grupos = []
  let acumulado = 0
  if (sedeSel) {
    for (const producto of seleccionados) {
      const variantes = variantesImprimibles(producto)
      const orden = ordenarTallas(variantes.map((v) => v.talla))
      const ordenadas = [...variantes].sort(
        (a, b) => orden.indexOf(a.talla) - orden.indexOf(b.talla),
      )

      // Una etiqueta por cada unidad con stock: si una talla tiene 2
      // unidades, se generan 2 stickers para pegar uno en cada una.
      const stickers = crearStickersProducto({
        producto,
        variantes: ordenadas,
        sede: etiquetaSede(sedeSel.nombre),
        precio: producto.precio,
        grupo: grupos.length + 1,
        totalGrupos: seleccionados.length,
        cantidadDe: (variante) => cantidadEnSede(variante),
      })
      const tallas = ordenadas.map((variante) => ({
        talla: tallaEtiqueta(variante),
        cantidad: cantidadEnSede(variante),
        codigo: variante.codigo_barras,
      }))

      grupos.push({
        numero: grupos.length + 1,
        totalGrupos: seleccionados.length,
        producto,
        stickers,
        tallas,
        total: stickers.length,
        desde: acumulado + 1,
        hasta: acumulado + stickers.length,
      })
      acumulado += stickers.length
    }
  }

  const total = grupos.reduce((suma, grupo) => suma + grupo.total, 0)
  const filas = total ? Math.ceil(total / config.columns) : 0
  const allStickers = grupos.flatMap((grupo) => grupo.stickers)
  const altoPaginaMm =
    config.marginTopMm + config.labelHeightMm + config.gapVMm + config.marginBottomMm

  function cambiarCategoria(valor) {
    setCategoriaId(valor)
    setSubcategoriaId('')
    setExcluidos(new Set())
    setTallasExcluidas(new Set())
    setErrorImpresion(null)
  }

  function cambiarSede(valor) {
    setSedeId(valor)
    setExcluidos(new Set())
    setTallasExcluidas(new Set())
    setErrorImpresion(null)
  }

  function cambiarSubcategoria(valor) {
    setSubcategoriaId(valor)
    setExcluidos(new Set())
    setTallasExcluidas(new Set())
    setErrorImpresion(null)
  }

  function alternarTalla(talla) {
    setTallasExcluidas((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(talla)) siguiente.delete(talla)
      else siguiente.add(talla)
      return siguiente
    })
  }

  function alternarProducto(id) {
    setExcluidos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  function seleccionarTodas() {
    setExcluidos(new Set())
  }

  function quitarTodas() {
    setExcluidos(new Set(productosVisibles.map((producto) => producto.id)))
  }

  function imprimirGuia() {
    if (!grupos.length || !sedeSel) return
    const gruposGuia = grupos.map((grupo) => ({
      ...grupo,
      producto: {
        ...grupo.producto,
        imagen_url: urlImagen(grupo.producto.imagen_thumb || grupo.producto.imagen_url),
      },
    }))

    const abierta = imprimirGuiaStickers({
      categoria: nombreCategoria,
      sede: etiquetaSede(sedeSel.nombre),
      grupos: gruposGuia,
    })

    setErrorImpresion(
      abierta
        ? null
        : 'El navegador bloqueó la ventana de la guía. Permite las ventanas emergentes e intenta de nuevo.',
    )
  }

  function imprimir(prueba = false, copias = 1) {
    if (!grupos.length || !sedeSel) return

    const abierta = imprimirStickers({
      stickers: prueba ? allStickers.slice(0, copias) : allStickers,
      config,
      titulo: prueba
        ? `Prueba · ${nombreCategoria}`
        : `Etiquetas · ${nombreCategoria} · ${etiquetaSede(sedeSel.nombre)}`,
    })

    setErrorImpresion(
      abierta
        ? null
        : 'No se pudo iniciar la impresión. Verifica el tamaño de página y vuelve a intentarlo.',
    )
  }

  const puedeImprimir = Boolean(sedeSel && total > 0)

  return (
    <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sticker-categoria-title"
        className="animate-scale-in flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
              <PrinterIcon className="h-5 w-5" />
            </span>
            <div>
              <h3
                id="sticker-categoria-title"
                className="font-display text-xl font-semibold tracking-tight text-ink"
              >
                Imprimir categoría
              </h3>
              <p className="mt-0.5 text-xs text-ink-2">
                Una etiqueta por cada unidad con stock, en filas de 3 columnas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">1. Categoría</span>
              <select
                value={categoriaId}
                onChange={(e) => cambiarCategoria(e.target.value)}
                className="select-field w-full rounded-lg border border-line bg-white px-3 py-2 pr-9 text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
              >
                <option value="">Selecciona una categoría…</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                    {categoria.catalogo ? ` · ${categoria.catalogo}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Subcategoría</span>
              <select
                value={subcategoriaId}
                onChange={(e) => cambiarSubcategoria(e.target.value)}
                disabled={!categoriaId || subcategoriasFiltro.length === 0}
                className="select-field w-full rounded-lg border border-line bg-white px-3 py-2 pr-9 text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25 disabled:bg-surface-2 disabled:text-ink-2/60"
              >
                <option value="">Toda la categoría</option>
                {subcategoriasFiltro.map((subcategoria) => (
                  <option key={subcategoria.id} value={subcategoria.id}>
                    {subcategoria.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">2. Sede</span>
              <select
                value={sedeId}
                onChange={(e) => cambiarSede(e.target.value)}
                className="select-field w-full rounded-lg border border-line bg-white px-3 py-2 pr-9 text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
              >
                <option value="">Selecciona la sede…</option>
                {opcionesSedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {etiquetaSede(sede.nombre)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {tallasDisponibles.length > 0 && (
            <div className="mb-5 rounded-xl border border-line bg-surface-2/50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink-2">
                  Tallas a imprimir
                </span>
                <button
                  type="button"
                  onClick={() => setTallasExcluidas(new Set())}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    tallasExcluidas.size === 0
                      ? 'border-ink bg-ink text-white'
                      : 'border-line bg-white text-ink-2 hover:border-ink-2/40'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setTallasExcluidas(new Set(tallasDisponibles))}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    tallasExcluidas.size === tallasDisponibles.length
                      ? 'border-ink bg-ink text-white'
                      : 'border-line bg-white text-ink-2 hover:border-ink-2/40'
                  }`}
                >
                  Ninguna
                </button>
                {tallasDisponibles.map((talla) => {
                  const activa = !tallasExcluidas.has(talla)
                  return (
                    <button
                      key={talla}
                      type="button"
                      onClick={() => alternarTalla(talla)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        activa
                          ? 'border-ink bg-ink text-white'
                          : 'border-line bg-white text-ink-2 hover:border-ink-2/40'
                      }`}
                    >
                      {talla}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-ink-2/70">
                Solo se imprimen las tallas activas. Cada unidad con stock genera su sticker.
              </p>
            </div>
          )}

          {!categoriaId ? (
            <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-2/70">
              Selecciona una categoría para cargar sus productos.
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-xl bg-surface-2" />
              <div className="h-56 animate-pulse rounded-xl bg-surface-2" />
              <div className="h-32 animate-pulse rounded-xl bg-surface-2" />
            </div>
          ) : isError ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertIcon className="h-4 w-4 shrink-0" />
              <p className="flex-1">
                {errorRaw?.message || 'No se pudieron cargar los productos de la categoría.'}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700"
              >
                Reintentar
              </button>
            </div>
          ) : !sedeSel ? (
            <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-2/70">
              Selecciona la sede para calcular las cantidades por talla.
            </div>
          ) : productosConStock.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-2/70">
              No hay productos de esta categoría con stock en {etiquetaSede(sedeSel.nombre)}.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {productosVisibles.length}{' '}
                    {productosVisibles.length === 1 ? 'producto' : 'productos'} con stock
                  </p>
                  <p className="text-xs text-ink-2">
                    {total} {total === 1 ? 'sticker' : 'stickers'} (una por unidad) ·{' '}
                    {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'} · {filas}{' '}
                    {filas === 1 ? 'fila' : 'filas'} de 3 columnas
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={seleccionarTodas}
                    className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-2 hover:border-ink hover:text-ink"
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={quitarTodas}
                    className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-2 hover:border-ink hover:text-ink"
                  >
                    Ninguna
                  </button>
                </div>
              </div>

              {productosVisibles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-2/70">
                  No hay productos con las tallas seleccionadas. Activa más tallas o pulsa
                  “Todas”.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-line">
                  <div className="grid grid-cols-[2rem_2.5rem_minmax(0,1fr)_minmax(0,1.25fr)_4rem] items-center gap-2 border-b border-line bg-surface-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-2">
                    <span />
                    <span>Foto</span>
                    <span>Producto / SKU</span>
                    <span>Tallas / cantidades</span>
                    <span className="text-right">Unidades</span>
                  </div>
                  <ul className="divide-y divide-line">
                    {productosVisibles.map((producto) => {
                    const imprimibles = variantesImprimibles(producto)
                    const totalUnidades = totalProducto(producto)
                    const puede = totalUnidades > 0
                    const activo = puede && !excluidos.has(producto.id)
                    const numero = activo
                      ? seleccionados.findIndex((p) => p.id === producto.id) + 1
                      : null
                    const tallas = imprimibles
                      .map((variante) => {
                        const cantidad = cantidadEnSede(variante)
                        return `${tallaEtiqueta(variante)} × ${cantidad}`
                      })
                      .join(' · ')

                    return (
                      <li key={producto.id}>
                        <label
                          className={`grid grid-cols-[2rem_2.5rem_minmax(0,1fr)_minmax(0,1.25fr)_4rem] items-center gap-2 px-3 py-2.5 text-sm ${
                            puede
                              ? 'cursor-pointer transition-colors hover:bg-surface-2/50'
                              : 'opacity-50'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={activo}
                              disabled={!puede}
                              onChange={() => alternarProducto(producto.id)}
                              className="h-4 w-4 rounded border-line text-ink focus:ring-metal"
                            />
                            {numero ? (
                              <span className="text-[10px] font-bold text-ink-2">#{numero}</span>
                            ) : null}
                          </span>
                          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-surface-2">
                            {producto.imagen_thumb || producto.imagen_url ? (
                              <img
                                src={urlImagen(producto.imagen_thumb || producto.imagen_url)}
                                alt=""
                                onError={(e) => {
                                  const img = e.currentTarget
                                  if (img.dataset.fallback || !producto.imagen_url) return
                                  img.dataset.fallback = '1'
                                  img.src = urlImagen(producto.imagen_url)
                                }}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {producto.nombre}
                            </span>
                            <span className="block truncate text-[11px] text-ink-2/70">
                              {producto.sku || '—'} · {numero ? `grupo #${numero}` : 'sin etiquetas'}
                            </span>
                          </span>
                          <span className="min-w-0 truncate text-xs text-ink-2">
                            {tallas || 'Sin código de barras'}
                          </span>
                          <span className="text-right font-semibold text-ink">{totalUnidades}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
              )}

              {sinCodigo.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Hay {sinCodigo.length}{' '}
                    {sinCodigo.length === 1 ? 'producto' : 'productos'} con alguna talla sin
                    código de barras. Esas tallas no se imprimen hasta que se les asigne un
                    código.
                  </p>
                </div>
              )}

              {sinStock > 0 && (
                <p className="text-[11px] text-ink-2/70">
                  {sinStock} {sinStock === 1 ? 'producto sin stock' : 'productos sin stock'} en
                  esta sede no se incluyen.
                </p>
              )}

              <div>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">Vista previa de impresión</p>
                    <p className="text-xs text-ink-2">
                      Página de {config.pageWidthMm} × {altoPaginaMm.toFixed(2)} mm ·{' '}
                      {config.columns} columnas de {config.labelWidthMm} × {config.labelHeightMm} mm
                    </p>
                  </div>
                  <p className="text-xs text-ink-2">
                    {filas} {filas === 1 ? 'fila' : 'filas'} en total · la guía y los stickers se
                    imprimen por separado.
                  </p>
                </div>

                {allStickers.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-line bg-surface-2/60 p-4">
                    <StickerSheetPreview stickers={allStickers} config={config} maxRows={2} />
                    {filas > 2 && (
                      <p className="mt-2 text-[11px] text-ink-2/70">
                        Se muestran las primeras 2 filas de {filas}.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-2/70">
                    Selecciona al menos un producto para ver la vista previa.
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  En Chrome selecciona el papel <b>STICKERS_3_COLUMNAS</b> de{' '}
                  {config.pageWidthMm} × {altoPaginaMm.toFixed(2)} mm. Si Chrome muestra A4 u otro
                  papel más grande, las etiquetas se verán pequeñas: el tamaño del papel lo define
                  el driver de Windows, no la aplicación.
                </p>
              </div>

              <p className="text-[11px] text-ink-2/70">
                La guía incluye foto, nombre, SKU, tallas y cantidades. Los stickers conservan su
                diseño: marca, producto, talla, precio, código, referencia y código de sede. Se
                genera una etiqueta por cada unidad con stock (si una talla tiene 2 unidades, salen
                2 stickers) y se distribuyen de 3 en 3. La guía sale en A4; los stickers usan una
                página de {config.pageWidthMm} × {altoPaginaMm.toFixed(2)} mm con 3 columnas de{' '}
                {config.labelWidthMm} × {config.labelHeightMm} mm. En el driver usa ese mismo papel,
                escala 100 % y márgenes “Ninguno”. Las medidas {config.labelWidthMm} ×{' '}
                {config.labelHeightMm} mm y {config.pageWidthMm} × {altoPaginaMm.toFixed(2)} mm son
                provisionales: confirma el ancho físico del soporte y las separaciones antes de
                imprimir.
              </p>

              {errorImpresion && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  {errorImpresion}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-xs text-ink-2">
            {total > 0
              ? `${total} ${total === 1 ? 'etiqueta' : 'etiquetas'} en ${grupos.length} ${
                  grupos.length === 1 ? 'grupo' : 'grupos'
                }`
              : 'Sin etiquetas para imprimir'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={imprimirGuia}
              disabled={!puedeImprimir}
              className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Guía de pegado
            </button>
            <button
              type="button"
              onClick={() => imprimir(true, 1)}
              disabled={!puedeImprimir}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-2 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Probar 1
            </button>
            <button
              type="button"
              onClick={() => imprimir(true, 3)}
              disabled={!puedeImprimir || total < 3}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-2 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Probar 3
            </button>
            <button
              type="button"
              onClick={() => imprimir(false)}
              disabled={!puedeImprimir}
              className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-metal-2 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PrinterIcon className="h-4 w-4" />
              {total > 0 ? `Imprimir ${total}` : 'Imprimir'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
