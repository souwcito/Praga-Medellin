import StickerPreview from './StickerPreview'
import { COLUMNAS_ETIQUETA } from '../utils/stickers'

const ESCALA = 1.5

// Vista previa de la hoja fisica: pagina completa con sus margenes, tres
// columnas y los espacios reales entre etiquetas. Muestra hasta `maxRows`
// filas para que se vea tambien la ultima fila incompleta.
export default function StickerSheetPreview({ stickers = [], config, maxRows = 2 }) {
  if (!stickers.length) return null

  const filas = []
  for (let i = 0; i < stickers.length && filas.length < maxRows; i += COLUMNAS_ETIQUETA) {
    filas.push(stickers.slice(i, i + COLUMNAS_ETIQUETA))
  }

  const anchoPagina = config.pageWidthMm * ESCALA
  const altoPagina =
    (config.marginTopMm + config.labelHeightMm + config.gapVMm + config.marginBottomMm) * ESCALA

  return (
    <div className="space-y-3">
      {filas.map((fila, indice) => (
        <div
          key={indice}
          className="relative overflow-hidden bg-white"
          style={{
            width: `${anchoPagina}mm`,
            height: `${altoPagina + 1}mm`,
            border: '0.2mm dashed #d6d3d1',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="flex"
            style={{
              position: 'absolute',
              left: `${config.marginLeftMm * ESCALA}mm`,
              top: `${config.marginTopMm * ESCALA}mm`,
              gap: `${config.gapHMm * ESCALA}mm`,
              transform: `scale(${ESCALA})`,
              transformOrigin: 'top left',
            }}
          >
            {Array.from({ length: COLUMNAS_ETIQUETA }, (_, columna) =>
              fila[columna] ? (
                <StickerPreview
                  key={`${indice}-${columna}`}
                  sticker={fila[columna]}
                  config={config}
                />
              ) : (
                <div
                  key={`${indice}-${columna}-vacio`}
                  style={{
                    width: `${config.labelWidthMm}mm`,
                    height: `${config.labelHeightMm}mm`,
                    border: '0.2mm dashed #e7e5e4',
                    boxSizing: 'border-box',
                  }}
                />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
