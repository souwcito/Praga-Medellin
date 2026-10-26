import StickerLabel from './StickerLabel'
import { DEFAULT_CONFIG, normalizarConfig } from '../utils/stickers'

// Vista previa exacta de una etiqueta. El borde punteado solo se ve en
// pantalla; la página de impresión no lo incluye.
export default function StickerPreview({ sticker, config }) {
  const cfg = config ? normalizarConfig(config) : DEFAULT_CONFIG

  return (
    <div
      style={{
        width: `${cfg.labelWidthMm}mm`,
        height: `${cfg.labelHeightMm}mm`,
        border: '0.2mm dashed #d6d3d1',
        boxSizing: 'content-box',
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <StickerLabel sticker={sticker} config={cfg} />
    </div>
  )
}
