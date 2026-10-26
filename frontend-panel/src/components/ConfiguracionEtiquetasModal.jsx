import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Modal from './Modal'
import { useConfiguracionEtiquetas } from '../hooks/useData'
import { etiquetasApi } from '../services/api'
import {
  DEFAULT_CONFIG,
  calcularPagina,
  configParaServidor,
  normalizarConfig,
} from '../utils/stickers'
import {
  cargarPerfilImpresora,
  guardarPerfilImpresora,
} from '../utils/labelPrinterProfile'
import { AlertIcon, CheckIcon, XIcon } from './icons'

const campo =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

function Numero({ label, value, onChange, min = 0, max = 300, step = 0.1, unit = 'mm' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-2">
        {label}{unit ? ` (${unit})` : ''}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={campo}
      />
    </label>
  )
}

function Check({ label, checked, onChange, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-line px-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-line text-ink focus:ring-metal"
      />
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {hint && <span className="block text-[11px] text-ink-2/70">{hint}</span>}
      </span>
    </label>
  )
}

export default function ConfiguracionEtiquetasModal({ onClose }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useConfiguracionEtiquetas()
  const [config, setConfig] = useState(() => normalizarConfig(DEFAULT_CONFIG))
  const [perfil, setPerfil] = useState(() => cargarPerfilImpresora())
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (data) setConfig(normalizarConfig(data))
  }, [data])

  const layout = calcularPagina(config)
  const anchoExacto = Math.abs(layout.anchoPagina - layout.anchoRequerido) <= 0.01

  function cambiar(campoConfig, valor) {
    setConfig((prev) => ({ ...prev, [campoConfig]: valor }))
    setMensaje(null)
    setError(null)
  }

  function cambiarPerfil(campoPerfil, valor) {
    setPerfil((prev) => ({ ...prev, [campoPerfil]: valor }))
    setMensaje(null)
    setError(null)
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    setMensaje(null)
    try {
      await etiquetasApi.updateConfig(configParaServidor(config))
      guardarPerfilImpresora(perfil)
      await queryClient.invalidateQueries({ queryKey: ['configuracion-etiquetas'] })
      setMensaje('Configuración guardada.')
    } catch (err) {
      setError(err?.message || err?.error || 'No se pudo guardar la configuración.')
    } finally {
      setGuardando(false)
    }
  }

  const escala = Math.min(2, 180 / Math.max(1, config.pageWidthMm))
  const anchoPreview = config.pageWidthMm * escala
  const altoPreview = layout.altoPagina * escala

  return (
    <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="config-etiquetas-title"
        className="animate-scale-in flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3
              id="config-etiquetas-title"
              className="font-display text-xl font-semibold tracking-tight text-ink"
            >
              Configuración de etiquetas
            </h3>
            <p className="mt-0.5 text-xs text-ink-2">
              La geometría compartida se guarda en el servidor; los ajustes de esta impresora se
              guardan en este computador.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="h-48 animate-pulse rounded-xl bg-surface-2" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              <div className="space-y-5">
                <section>
                  <h4 className="mb-2 text-sm font-semibold text-ink">Geometría compartida</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Numero label="Ancho de página" value={config.pageWidthMm} onChange={(v) => cambiar('pageWidthMm', v)} min={20} max={300} />
                    <div className="grid grid-cols-2 gap-3">
                      <Numero label="Ancho etiqueta" value={config.labelWidthMm} onChange={(v) => cambiar('labelWidthMm', v)} min={5} max={100} />
                      <Numero label="Alto etiqueta" value={config.labelHeightMm} onChange={(v) => cambiar('labelHeightMm', v)} min={5} max={100} />
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-2">
                        Columnas (fijas)
                      </span>
                      <input
                        type="number"
                        value={config.columns}
                        disabled
                        className={`${campo} disabled:bg-surface-2 disabled:text-ink-2`}
                      />
                      <span className="mt-1 block text-[10px] text-ink-2/70">
                        El rollo actual imprime siempre 3 columnas.
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <Numero label="Separación H" value={config.gapHMm} onChange={(v) => cambiar('gapHMm', v)} />
                      <Numero label="Separación V" value={config.gapVMm} onChange={(v) => cambiar('gapVMm', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Numero label="Margen izquierdo" value={config.marginLeftMm} onChange={(v) => cambiar('marginLeftMm', v)} />
                      <Numero label="Margen derecho" value={config.marginRightMm} onChange={(v) => cambiar('marginRightMm', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Numero label="Margen superior" value={config.marginTopMm} onChange={(v) => cambiar('marginTopMm', v)} />
                      <Numero label="Margen inferior" value={config.marginBottomMm} onChange={(v) => cambiar('marginBottomMm', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Numero label="Alto código" value={config.barcodeHeightMm} onChange={(v) => cambiar('barcodeHeightMm', v)} min={2} max={12} />
                      <Numero label="Ancho código" value={config.barcodeMaxWidthMm} onChange={(v) => cambiar('barcodeMaxWidthMm', v)} min={5} max={30} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Numero label="Fuente base" value={config.fontSizePt} onChange={(v) => cambiar('fontSizePt', v)} min={6} max={12} unit="pt" />
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-ink-2">Orientación</span>
                        <select
                          value={config.orientation}
                          onChange={(e) => cambiar('orientation', e.target.value)}
                          className={campo}
                        >
                          <option value="landscape">Horizontal</option>
                          <option value="portrait">Vertical</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="mb-2 text-sm font-semibold text-ink">Contenido</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-ink-2">Texto de marca</span>
                      <input
                        type="text"
                        value={config.brandText}
                        onChange={(e) => cambiar('brandText', e.target.value)}
                        className={campo}
                      />
                    </label>
                    <Check label="Mostrar nombre" checked={config.showName} onChange={(v) => cambiar('showName', v)} />
                    <Check label="Mostrar precio" checked={config.showPrice} onChange={(v) => cambiar('showPrice', v)} />
                    <Check label="Mostrar talla" checked={config.showSize} onChange={(v) => cambiar('showSize', v)} />
                    <Check label="Mostrar referencia SKU" checked={config.showReference} onChange={(v) => cambiar('showReference', v)} />
                    <Check
                      label="Mostrar código de sede"
                      checked={config.showSede}
                      onChange={(v) => cambiar('showSede', v)}
                      hint="AR, AN, AK o PW junto a la marca."
                    />
                  </div>
                </section>

                <section>
                  <h4 className="mb-2 text-sm font-semibold text-ink">Esta PC / impresora</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-ink-2">Nombre en Windows</span>
                      <input
                        type="text"
                        value={perfil.printerName}
                        onChange={(e) => cambiarPerfil('printerName', e.target.value)}
                        className={campo}
                      />
                    </label>
                    <Numero label="Ajuste fino X" value={perfil.offsetXMm} onChange={(v) => cambiarPerfil('offsetXMm', v)} min={-20} max={20} />
                    <Numero label="Ajuste fino Y" value={perfil.offsetYMm} onChange={(v) => cambiarPerfil('offsetYMm', v)} min={-20} max={20} />
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-2">Velocidad (driver)</span>
                      <input
                        type="text"
                        value={perfil.speed}
                        onChange={(e) => cambiarPerfil('speed', e.target.value)}
                        placeholder="Ej. 4 ips"
                        className={campo}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-2">Densidad (driver)</span>
                      <input
                        type="text"
                        value={perfil.density}
                        onChange={(e) => cambiarPerfil('density', e.target.value)}
                        placeholder="Ej. 8"
                        className={campo}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-ink-2">Nota de calibración</span>
                      <input
                        type="text"
                        value={perfil.calibrationNote}
                        onChange={(e) => cambiarPerfil('calibrationNote', e.target.value)}
                        placeholder="Ej. calibrado el 23/10/2026"
                        className={campo}
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-[11px] text-ink-2/70">
                    Velocidad y densidad se ajustan en el driver o en el agente compatible con la
                    impresora; no se aplican por CSS. Para calibrar el sensor en la GS-2406T,
                    apaga la impresora, mantén presionados PAUSE + FEED, enciéndela y suelta cuando
                    los LED azul y rojo se enciendan. Luego imprime una etiqueta de prueba.
                  </p>
                </section>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-ink">Vista previa de la distribución</h4>
                <div className="overflow-auto rounded-xl border border-line bg-surface-2/50 p-4">
                  <div
                    style={{
                      width: `${anchoPreview}mm`,
                      height: `${altoPreview}mm`,
                      position: 'relative',
                      background: '#fff',
                      border: '0.2mm dashed #a8a29e',
                    }}
                  >
                    {layout.posiciones.map((x, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          left: `${x * escala}mm`,
                          top: `${config.marginTopMm * escala}mm`,
                          width: `${config.labelWidthMm * escala}mm`,
                          height: `${config.labelHeightMm * escala}mm`,
                          border: '0.2mm dashed #d6d3d1',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: `${config.fontSizePt * 0.65 * escala}pt`,
                          color: '#a8a29e',
                        }}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`rounded-xl border px-3 py-2 text-xs ${layout.cabe ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {layout.cabe ? (
                    <span className="flex items-start gap-1.5">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        La cuadrícula de {layout.columnas} columnas requiere{' '}
                        {layout.anchoRequerido} mm.
                        {anchoExacto
                          ? ' Coincide exactamente con el ancho de página configurado.'
                          : ` Sobran ${layout.sobraMm} mm a la derecha: revisa el ancho de página o los márgenes para que las columnas coincidan con el rollo.`}
                      </span>
                    </span>
                  ) : (
                    <span className="flex items-start gap-1.5">
                      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      No cabe: requiere {layout.anchoRequerido} mm y la página tiene{' '}
                      {layout.anchoPagina} mm. Ajusta el ancho, los gaps o los márgenes.
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-line bg-surface-2/40 px-3 py-2 text-[11px] text-ink-2">
                  <div>Página: {config.pageWidthMm} × {layout.altoPagina} mm</div>
                  <div>Etiqueta: {config.labelWidthMm} × {config.labelHeightMm} mm</div>
                  <div>Columnas: {layout.columnas} (fijas) · Gap H: {config.gapHMm} mm · Gap V: {config.gapVMm} mm</div>
                  <div>Requerido: {layout.anchoRequerido} mm · Configurado: {layout.anchoPagina} mm</div>
                  <div>La impresión siempre usa una fila completa (3 columnas) por página.</div>
                </div>
                {mensaje && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    {mensaje}
                  </p>
                )}
                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-[11px] text-ink-2/70">
            Formato provisional: etiqueta de {config.labelWidthMm} × {config.labelHeightMm} mm,
            3 columnas y página de {config.pageWidthMm} × {layout.altoPagina} mm. Confirma el ancho
            físico del soporte, la separación horizontal y los márgenes antes de imprimir.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-2 hover:border-ink hover:text-ink"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando || !layout.cabe}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-metal-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {guardando ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
