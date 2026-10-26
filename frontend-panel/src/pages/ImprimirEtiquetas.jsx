import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StickerLabel from '../components/StickerLabel'
import { DEFAULT_CONFIG, calcularPagina, construirPaginas, normalizarConfig } from '../utils/stickers'
import { cargarPerfilImpresora } from '../utils/labelPrinterProfile'

function leerTrabajo(id) {
  if (!id) return null
  try {
    return JSON.parse(localStorage.getItem(`praga_label_job_${id}`) || 'null')
  } catch {
    return null
  }
}

// Página independiente del panel: solo contiene las etiquetas. Se abre desde
// el botón Imprimir para que el navegador no imprima el layout de la aplicación.
export default function ImprimirEtiquetas() {
  const [params] = useSearchParams()
  const [job] = useState(() => leerTrabajo(params.get('job')))
  const [imprimiendo, setImprimiendo] = useState(false)
  const impreso = useRef(false)

  const config = normalizarConfig(job?.config || DEFAULT_CONFIG)
  const layout = calcularPagina(config)
  const paginas = job ? construirPaginas(job.stickers || []) : []
  const perfil = cargarPerfilImpresora()
  const offsetX = Number(perfil.offsetXMm) || 0
  const offsetY = Number(perfil.offsetYMm) || 0

  useEffect(() => {
    if (!job || !layout.cabe || !paginas.length) return
    document.title = ''
    let cancelado = false
    const imprimir = async () => {
      try {
        await document.fonts?.ready
      } catch {
        /* ignore */
      }
      if (cancelado) return
      setTimeout(() => {
        if (cancelado || impreso.current) return
        impreso.current = true
        setImprimiendo(true)
        try {
          window.focus()
        } catch {
          /* ignore */
        }
        window.print()
      }, 350)
    }
    imprimir()
    return () => {
      cancelado = true
    }
  }, [job, layout.cabe, paginas.length])

  if (!job) {
    return (
      <div style={{ padding: '12mm', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ fontSize: 16, margin: 0 }}>No se encontró el trabajo de impresión</h1>
        <p style={{ fontSize: 11 }}>Vuelve al panel y solicita la impresión nuevamente.</p>
      </div>
    )
  }

  return (
    <div className="print-root">
      <style>{`
        @page {
          size: ${config.pageWidthMm}mm ${layout.altoPagina}mm;
          margin: 0;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          color: #000;
        }
        .print-root {
          width: ${config.pageWidthMm}mm;
          margin: 0;
          padding: 0;
        }
        .print-page {
          position: relative;
          width: ${config.pageWidthMm}mm;
          height: ${layout.altoPagina}mm;
          page-break-after: always;
          break-after: page;
          overflow: hidden;
          background: #fff;
        }
        .print-page:last-child { page-break-after: auto; break-after: auto; }
        .print-slot {
          position: absolute;
          overflow: hidden;
          background: #fff;
        }
        .no-print {
          position: fixed;
          z-index: 20;
          top: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid #d6d3d1;
          border-radius: 10px;
          background: rgba(255,255,255,.96);
          font-family: Arial, sans-serif;
          font-size: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,.08);
        }
        .no-print button {
          border: 1px solid #111;
          background: #111;
          color: #fff;
          border-radius: 8px;
          padding: 6px 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .no-print small { color: #57534e; display: block; margin-top: 2px; }
        @media print {
          .no-print { display: none !important; }
          html, body, .print-root {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-page { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>

      {!layout.cabe && (
        <div className="no-print">
          <div>
            <strong>La distribución no cabe en el ancho configurado.</strong>
            <small>
              Se necesitan {layout.anchoRequerido} mm y la página tiene {layout.anchoPagina} mm.
            </small>
          </div>
        </div>
      )}

      {layout.cabe && (
        <div className="no-print">
          <div>
            <strong>Etiquetas listas para imprimir</strong>
            <small>
              Usa la Gainscha GS-2406T, papel de {config.pageWidthMm} × {config.labelHeightMm} mm
              (3 columnas), escala 100 %, sin márgenes y sin encabezados ni pies de página.
            </small>
          </div>
          <button
            type="button"
            onClick={() => {
              impreso.current = true
              setImprimiendo(true)
              window.print()
            }}
          >
            {imprimiendo ? 'Imprimir de nuevo' : 'Imprimir'}
          </button>
        </div>
      )}

      <div style={{ height: '10mm' }} className="no-print" />

      {layout.cabe &&
        paginas.map((fila, indicePagina) => (
          <div className="print-page" key={`pagina-${indicePagina}`}>
            {fila.map((sticker, indiceColumna) => {
              if (!sticker) return null
              return (
                <div
                  key={`${sticker.codigo}-${indicePagina}-${indiceColumna}`}
                  className="print-slot"
                  style={{
                    left: `${layout.posiciones[indiceColumna] + offsetX}mm`,
                    top: `${config.marginTopMm + offsetY}mm`,
                    width: `${config.labelWidthMm}mm`,
                    height: `${config.labelHeightMm}mm`,
                  }}
                >
                  <StickerLabel sticker={sticker} config={config} />
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}
