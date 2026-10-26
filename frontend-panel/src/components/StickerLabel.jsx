import { useLayoutEffect, useRef } from 'react'
import {
  DEFAULT_CONFIG,
  ajustarEtiqueta,
  barcodeSvg,
  estilosEtiqueta,
  metricasEtiqueta,
  normalizarConfig,
} from '../utils/stickers'

const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

// Renderiza una etiqueta con las medidas configuradas. Usa las mismas metricas
// y el mismo auto-ajuste que la impresion para que la vista previa sea exacta.
export default function StickerLabel({ sticker, config }) {
  const cfg = normalizarConfig(config || DEFAULT_CONFIG)
  const metricas = metricasEtiqueta(cfg)
  const estilos = estilosEtiqueta(cfg)
  const marca = String(sticker.marca || cfg.brandText || '').trim()
  const mostrarCodigoSede = cfg.showSede && !sticker.marca
  const marcaTexto = [marca, mostrarCodigoSede ? sticker.sedeCodigo : '']
    .filter(Boolean)
    .join(' · ')
  const ref = useRef(null)

  useLayoutEffect(() => {
    ajustarEtiqueta(ref.current)
  }, [sticker, cfg])

  return (
    <div ref={ref} style={estilos.label}>
      {marcaTexto ? <div style={estilos.brand}>{marcaTexto}</div> : null}

      {cfg.showName && (
        <div
          data-fit="nombre"
          data-min-pt={metricas.nameMinPt}
          data-max-pt={metricas.namePt}
          data-max-mm={metricas.nameMaxHeightMm}
          style={estilos.name}
        >
          {sticker.nombre}
        </div>
      )}

      {(cfg.showPrice || cfg.showSize) && (
        <div
          data-fit="fila"
          data-min-pt={metricas.rowMinPt}
          data-max-pt={metricas.rowPt}
          style={estilos.row}
        >
          {cfg.showSize && <span>{sticker.talla}</span>}
          {cfg.showPrice && <span>{formato(sticker.precio)}</span>}
        </div>
      )}

      <div
        data-barcode={sticker.codigo}
        style={estilos.barcode}
        dangerouslySetInnerHTML={{
          __html: barcodeSvg(sticker.codigo, { aspect: metricas.barcodeAspect }),
        }}
      />

      {cfg.showReference && (
        <div
          data-fit="ref"
          data-min-pt={metricas.refMinPt}
          data-max-pt={metricas.refPt}
          style={estilos.ref}
        >
          {sticker.referencia}
        </div>
      )}
    </div>
  )
}
