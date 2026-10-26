import { useMemo, useState } from 'react'
import Modal from './Modal'
import StickerSheetPreview from './StickerSheetPreview'
import { useConfiguracionEtiquetas, useStockProducto } from '../hooks/useData'
import { ordenarTallas } from '../utils/catalogo'
import {
  DEFAULT_CONFIG,
  crearStickersProducto,
  etiquetaSede,
  imprimirStickers,
  normalizarConfig,
} from '../utils/stickers'
import { codigoBarrasProducto, referenciaEtiquetaProducto } from '../utils/codigoEtiqueta'
import { normalizarTallaVisible } from '../utils/tallas'
import { AlertIcon, PrinterIcon, XIcon } from './icons'

export default function StickerProductoModal({ producto, onClose }) {
  const { data, isLoading, isError, error: errorRaw, refetch } = useStockProducto(producto?.id)
  const { data: configData } = useConfiguracionEtiquetas()
  const config = normalizarConfig(configData || DEFAULT_CONFIG)
  const [sedeId, setSedeId] = useState('')
  const [excluidos, setExcluidos] = useState(() => new Set())
  const [errorImpresion, setErrorImpresion] = useState(null)

  const variantes = useMemo(() => {
    const lista = [...(data?.variantes || [])]
    const orden = ordenarTallas(lista.map((v) => v.talla))
    return lista.sort((a, b) => orden.indexOf(a.talla) - orden.indexOf(b.talla))
  }, [data])

  const sedeSel = data?.sedes?.find((s) => String(s.id) === String(sedeId))

  const cantidadEnSede = (variante, sede = sedeSel) => {
    if (!sede) return 0
    return Number(
      variante.stock?.find((s) => String(s.sede_id) === String(sede.id))?.cantidad || 0,
    )
  }

  const tieneCodigo = (variante) =>
    Boolean(String(data?.producto?.sku || '').trim() || String(variante.codigo_barras || '').trim())
  const conStock = variantes.filter((v) => cantidadEnSede(v) > 0)
  const sinCodigo = conStock.filter((v) => !tieneCodigo(v))
  const seleccionados = conStock.filter((v) => !excluidos.has(v.id) && tieneCodigo(v))
  const tallasDisponibles = ordenarTallas([
    ...new Set(conStock.map((v) => normalizarTallaVisible(v.talla) || 'Unitalla')),
  ])
  // Una etiqueta por cada unidad con stock: si una talla tiene 2 unidades,
  // se imprimen 2 stickers para pegar uno en cada unidad.
  const totalEtiquetas = seleccionados.reduce(
    (suma, variante) => suma + cantidadEnSede(variante),
    0,
  )
  const filas = totalEtiquetas ? Math.ceil(totalEtiquetas / config.columns) : 0
  const altoPaginaMm =
    config.marginTopMm + config.labelHeightMm + config.gapVMm + config.marginBottomMm

  const previewStickers =
    data?.producto && sedeSel
      ? crearStickersProducto({
          producto: data.producto,
          variantes: seleccionados,
          sede: etiquetaSede(sedeSel.nombre),
          precio: data.producto.precio,
          cantidadDe: (variante) => cantidadEnSede(variante),
        })
      : []

  function cambiarSede(valor) {
    setSedeId(valor)
    setExcluidos(new Set())
    setErrorImpresion(null)
  }

  function alternarVariante(id) {
    setExcluidos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  function alternarTalla(talla) {
    const ids = conStock
      .filter((v) => (normalizarTallaVisible(v.talla) || 'Unitalla') === talla)
      .map((v) => v.id)
    setExcluidos((prev) => {
      const siguiente = new Set(prev)
      const todosIncluidos = ids.every((id) => !prev.has(id))
      ids.forEach((id) => {
        if (todosIncluidos) siguiente.add(id)
        else siguiente.delete(id)
      })
      return siguiente
    })
  }

  function seleccionarTodas() {
    setExcluidos(new Set())
  }

  function quitarTodas() {
    setExcluidos(new Set(conStock.map((v) => v.id)))
  }

  function construirStickers() {
    if (!data?.producto || !sedeSel) return []
    return crearStickersProducto({
      producto: data.producto,
      variantes: seleccionados,
      sede: etiquetaSede(sedeSel.nombre),
      precio: data.producto.precio,
      cantidadDe: (variante) => cantidadEnSede(variante),
    })
  }

  function imprimir(prueba = false, copias = 1) {
    if (!data?.producto || !sedeSel) return
    const stickers = construirStickers()
    if (!stickers.length) return

    const abierta = imprimirStickers({
      stickers: prueba ? stickers.slice(0, copias) : stickers,
      config,
      titulo: prueba
        ? `Prueba · ${data.producto.nombre}`
        : `Etiquetas · ${data.producto.nombre}`,
    })

    if (!abierta) {
      setErrorImpresion(
        'No se pudo iniciar la impresión. Verifica el tamaño de página y vuelve a intentarlo.',
      )
    } else {
      setErrorImpresion(null)
    }
  }

  const nombreProducto = data?.producto?.nombre || producto?.nombre || 'Producto'
  const puedeImprimir = Boolean(data?.producto && sedeSel && totalEtiquetas > 0)

  return (
    <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sticker-title"
        className="animate-scale-in flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
              <PrinterIcon className="h-5 w-5" />
            </span>
            <div>
              <h3
                id="sticker-title"
                className="font-display text-xl font-semibold tracking-tight text-ink"
              >
                Imprimir stickers
              </h3>
              <p className="mt-0.5 text-xs text-ink-2">{nombreProducto}</p>
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
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-11 w-64 animate-pulse rounded-xl bg-surface-2" />
              <div className="h-28 animate-pulse rounded-xl bg-surface-2" />
              <div className="h-32 animate-pulse rounded-xl bg-surface-2" />
            </div>
          ) : isError ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertIcon className="h-4 w-4 shrink-0" />
              <p className="flex-1">
                {errorRaw?.message || 'No se pudo consultar el stock del producto.'}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label htmlFor="sticker-sede" className="mb-1.5 block text-sm font-medium text-ink">
                  1. Sede
                </label>
                <select
                  id="sticker-sede"
                  value={sedeId}
                  onChange={(e) => cambiarSede(e.target.value)}
                  className="select-field w-full rounded-lg border border-line bg-white px-3 py-2 pr-9 text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
                >
                  <option value="">Selecciona la sede…</option>
                  {(data?.sedes || []).map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {etiquetaSede(sede.nombre)}
                    </option>
                  ))}
                </select>
              </div>

              {!sedeSel ? (
                <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-2/70">
                  Selecciona una sede para ver las tallas y el stock disponible.
                </div>
              ) : variantes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-2/70">
                  Este producto no tiene tallas o variantes registradas.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {conStock.length} {conStock.length === 1 ? 'talla con stock' : 'tallas con stock'}
                      </p>
                      <p className="text-xs text-ink-2">
                        Se imprimirá una etiqueta por cada unidad con stock. Si una talla
                        tiene 2 unidades, salen 2 stickers para pegar uno en cada una.
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

                  {tallasDisponibles.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5">
                      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink-2">
                        Filtrar tallas
                      </span>
                      {tallasDisponibles.map((talla) => {
                        const ids = conStock
                          .filter(
                            (v) => (normalizarTallaVisible(v.talla) || 'Unitalla') === talla,
                          )
                          .map((v) => v.id)
                        const activa = ids.some((id) => !excluidos.has(id))
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
                  )}

                  <div className="overflow-hidden rounded-xl border border-line">
                    <div className="grid grid-cols-[2rem_4rem_1fr_5rem] items-center gap-2 border-b border-line bg-surface-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-2">
                      <span />
                      <span>Talla</span>
                      <span>Código de barras</span>
                      <span className="text-right">Unidades</span>
                    </div>
                    <ul className="divide-y divide-line">
                      {variantes.map((variante) => {
                        const cantidad = cantidadEnSede(variante)
                        const tieneCodigoVariante = tieneCodigo(variante)
                        const puede = cantidad > 0 && tieneCodigoVariante
                        const activo = seleccionados.some((v) => v.id === variante.id)

                        return (
                          <li key={variante.id}>
                            <label
                              className={`grid grid-cols-[2rem_4rem_1fr_5rem] items-center gap-2 px-3 py-2.5 text-sm ${
                                puede
                                  ? 'cursor-pointer transition-colors hover:bg-surface-2/50'
                                  : 'opacity-45'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={activo}
                                disabled={!puede}
                                onChange={() => alternarVariante(variante.id)}
                                className="h-4 w-4 rounded border-line text-ink focus:ring-metal"
                              />
                              <span className="font-semibold text-ink">
                                {normalizarTallaVisible(variante.talla) || 'Unitalla'}
                              </span>
                              <span className="min-w-0 truncate text-xs text-ink-2">
                                {tieneCodigoVariante ? (
                                  <>
                                    <span className="font-mono">
                                      {codigoBarrasProducto({
                                        sku: data.producto.sku,
                                        talla: variante.talla,
                                        codigo_barras: variante.codigo_barras,
                                        id: variante.id,
                                      })}
                                    </span>
                                    <span className="ml-1 text-ink-2/60">
                                      ·{' '}
                                      {referenciaEtiquetaProducto({
                                        sku: data.producto.sku,
                                        talla: variante.talla,
                                        codigo_barras: variante.codigo_barras,
                                      })}
                                    </span>
                                  </>
                                ) : (
                                  'Sin código de barras'
                                )}
                              </span>
                              <span
                                className={`text-right font-semibold ${
                                  cantidad === 0 ? 'text-ink-2/50' : 'text-ink'
                                }`}
                              >
                                {cantidad}
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  {conStock.length === 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <AlertIcon className="h-4 w-4 shrink-0" />
                      No hay stock de este producto en la sede seleccionada.
                    </div>
                  )}

                  {sinCodigo.length > 0 && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        Hay {sinCodigo.length}{' '}
                        {sinCodigo.length === 1 ? 'talla sin código de barras' : 'tallas sin código de barras'}.
                        Esas tallas no se pueden imprimir hasta que se les asigne un código.
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink">Vista previa</p>
                        <p className="text-xs text-ink-2">
                          Página de {config.pageWidthMm} × {altoPaginaMm.toFixed(2)} mm ·{' '}
                          {config.columns} columnas de {config.labelWidthMm} ×{' '}
                          {config.labelHeightMm} mm
                        </p>
                      </div>
                      <p className="text-xs text-ink-2">
                        {totalEtiquetas} {totalEtiquetas === 1 ? 'sticker' : 'stickers'} · {filas}{' '}
                        {filas === 1 ? 'fila' : 'filas'}
                      </p>
                    </div>

                    {previewStickers.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-line bg-surface-2/60 p-4">
                        <StickerSheetPreview
                          stickers={previewStickers}
                          config={config}
                          maxRows={2}
                        />
                        {filas > 2 && (
                          <p className="mt-2 text-[11px] text-ink-2/70">
                            Se muestran las primeras 2 filas de {filas}.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-2/70">
                        Selecciona al menos una talla con stock para ver la vista previa.
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      En Chrome selecciona el papel <b>STICKERS_3_COLUMNAS</b> de{' '}
                      {config.pageWidthMm} × {altoPaginaMm.toFixed(2)} mm. Si Chrome muestra A4 u
                      otro papel más grande, las etiquetas se verán pequeñas: el tamaño del papel lo
                      define el driver de Windows, no la aplicación.
                    </p>
                  </div>

                  <p className="text-[11px] text-ink-2/70">
                    Haz una fila de prueba y verifica que el lector lea el código. Se genera una
                    etiqueta por cada unidad con stock: si una talla tiene 2 unidades, salen 2
                    stickers. En el diálogo de impresión elige la Gainscha GS-2406T, escala 100 %,
                    márgenes “Ninguno”, orientación horizontal y desactiva encabezados y pies de
                    página. La página debe ser {config.pageWidthMm} × {altoPaginaMm.toFixed(2)} mm
                    (3 columnas de {config.labelWidthMm} mm). Si todo sale en una sola columna o
                    reducido, el driver está usando A4 u otro papel. Las medidas {config.labelWidthMm}{' '}
                    × {config.labelHeightMm} mm y {config.pageWidthMm} ×{' '}
                    {altoPaginaMm.toFixed(2)} mm son provisionales: confirma el soporte físico. El
                    código de barras usa un código corto único para que el lector lo lea de una en
                    30 × 20 mm; la referencia muestra el SKU y la talla, y el POS lleva el escaneo a
                    la variante exacta.
                  </p>
                </>
              )}

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
            {totalEtiquetas > 0
              ? `${totalEtiquetas} ${totalEtiquetas === 1 ? 'etiqueta' : 'etiquetas'} en ${filas} ${
                  filas === 1 ? 'fila' : 'filas'
                }`
              : 'Sin etiquetas para imprimir'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink"
            >
              Cerrar
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
              disabled={!puedeImprimir || totalEtiquetas < 3}
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
              {totalEtiquetas > 0 ? `Imprimir ${totalEtiquetas}` : 'Imprimir'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
