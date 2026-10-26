// Etiquetas de producto para la Gainscha GS-2406T.
//
// CONFIGURACION CENTRALIZADA DEL FORMATO FISICO
// Medidas provisionales confirmadas por el usuario:
//   - una etiqueta: 30 x 20 mm
//   - 3 columnas independientes por fila
//   - separacion horizontal existente: 2 mm (provisional)
//   - margenes laterales existentes: 2 mm por lado (provisional)
//   - separacion vertical y margenes superior/inferior: 0 (provisional)
//
// La pagina de una fila se DERIVA de esos valores:
//   2 + (3 x 30) + (2 x 2) + 2 = 98 mm de ancho
//   alto = 20 mm + separacion vertical + margenes = 20 mm
//
// PENDIENTE DE CONFIRMAR FISICAMENTE: ancho real del soporte, separacion
// horizontal real, margenes laterales reales, separacion vertical/paso y
// limite imprimible de la GS-2406T. Se ajustan solo en Configuracion de
// etiquetas; no hay medidas dispersas en los componentes.
import JsBarcode from 'jsbarcode'
import { cargarPerfilImpresora } from './labelPrinterProfile.js'
import { codigoBarrasProducto, esTallaUnica } from './codigoEtiqueta.js'
import { normalizarTallaVisible } from './tallas.js'

// El rollo configurado tiene tres etiquetas por fila. La impresion siempre
// respeta esa cuadricula, aunque la configuracion guardada tenga otro valor.
export const COLUMNAS_ETIQUETA = 3

export const DEFAULT_CONFIG = {
  pageWidthMm: 98,
  labelWidthMm: 30,
  labelHeightMm: 20,
  columns: 3,
  gapHMm: 2,
  gapVMm: 0,
  marginTopMm: 0,
  marginRightMm: 2,
  marginBottomMm: 0,
  marginLeftMm: 2,
  orientation: 'landscape',
  barcodeHeightMm: 7,
  barcodeMaxWidthMm: 28,
  fontSizePt: 9,
  brandText: 'PRAGA',
  showName: true,
  showPrice: true,
  showSize: true,
  showReference: true,
  showSede: true,
  showGroup: false,
}

const numero = (valor, alternativo) => {
  const n = Number(valor)
  return Number.isFinite(n) ? n : alternativo
}

const booleano = (valor, alternativo) =>
  typeof valor === 'boolean' ? valor : valor === undefined ? alternativo : Boolean(valor)

// Acepta tanto la respuesta del backend (snake_case) como un objeto ya
// normalizado (camelCase). Devuelve siempre la misma forma.
export function normalizarConfig(raw = {}) {
  return {
    pageWidthMm: numero(raw.page_width_mm ?? raw.pageWidthMm, DEFAULT_CONFIG.pageWidthMm),
    labelWidthMm: numero(raw.label_width_mm ?? raw.labelWidthMm, DEFAULT_CONFIG.labelWidthMm),
    labelHeightMm: numero(raw.label_height_mm ?? raw.labelHeightMm, DEFAULT_CONFIG.labelHeightMm),
    // La cuadricula de impresion es siempre de 3 columnas (rollo actual).
    columns: COLUMNAS_ETIQUETA,
    gapHMm: numero(raw.gap_h_mm ?? raw.gapHMm, DEFAULT_CONFIG.gapHMm),
    gapVMm: numero(raw.gap_v_mm ?? raw.gapVMm, DEFAULT_CONFIG.gapVMm),
    marginTopMm: numero(raw.margin_top_mm ?? raw.marginTopMm, DEFAULT_CONFIG.marginTopMm),
    marginRightMm: numero(raw.margin_right_mm ?? raw.marginRightMm, DEFAULT_CONFIG.marginRightMm),
    marginBottomMm: numero(
      raw.margin_bottom_mm ?? raw.marginBottomMm,
      DEFAULT_CONFIG.marginBottomMm,
    ),
    marginLeftMm: numero(raw.margin_left_mm ?? raw.marginLeftMm, DEFAULT_CONFIG.marginLeftMm),
    orientation: (raw.orientation ?? DEFAULT_CONFIG.orientation) === 'portrait'
      ? 'portrait'
      : 'landscape',
    barcodeHeightMm: numero(
      raw.barcode_height_mm ?? raw.barcodeHeightMm,
      DEFAULT_CONFIG.barcodeHeightMm,
    ),
    barcodeMaxWidthMm: numero(
      raw.barcode_max_width_mm ?? raw.barcodeMaxWidthMm,
      DEFAULT_CONFIG.barcodeMaxWidthMm,
    ),
    fontSizePt: numero(raw.font_size_pt ?? raw.fontSizePt, DEFAULT_CONFIG.fontSizePt),
    brandText: String(raw.brand_text ?? raw.brandText ?? DEFAULT_CONFIG.brandText),
    showName: booleano(raw.show_name ?? raw.showName, DEFAULT_CONFIG.showName),
    showPrice: booleano(raw.show_price ?? raw.showPrice, DEFAULT_CONFIG.showPrice),
    showSize: booleano(raw.show_size ?? raw.showSize, DEFAULT_CONFIG.showSize),
    showReference: booleano(raw.show_reference ?? raw.showReference, DEFAULT_CONFIG.showReference),
    showSede: booleano(raw.show_sede ?? raw.showSede, DEFAULT_CONFIG.showSede),
    showGroup: booleano(raw.show_group ?? raw.showGroup, DEFAULT_CONFIG.showGroup),
  }
}

// La respuesta del servidor usa snake_case.
export function configParaServidor(config) {
  return {
    page_width_mm: config.pageWidthMm,
    label_width_mm: config.labelWidthMm,
    label_height_mm: config.labelHeightMm,
    columns: COLUMNAS_ETIQUETA,
    gap_h_mm: config.gapHMm,
    gap_v_mm: config.gapVMm,
    margin_top_mm: config.marginTopMm,
    margin_right_mm: config.marginRightMm,
    margin_bottom_mm: config.marginBottomMm,
    margin_left_mm: config.marginLeftMm,
    orientation: config.orientation,
    barcode_height_mm: config.barcodeHeightMm,
    barcode_max_width_mm: config.barcodeMaxWidthMm,
    font_size_pt: config.fontSizePt,
    brand_text: config.brandText,
    show_name: config.showName,
    show_price: config.showPrice,
    show_size: config.showSize,
    show_reference: config.showReference,
    show_sede: config.showSede,
    show_group: config.showGroup,
  }
}

export function calcularPagina(config) {
  const columnas = COLUMNAS_ETIQUETA
  const anchoRequerido =
    config.marginLeftMm +
    columnas * config.labelWidthMm +
    Math.max(0, columnas - 1) * config.gapHMm +
    config.marginRightMm
  const altoPagina =
    config.marginTopMm +
    config.labelHeightMm +
    config.marginBottomMm +
    config.gapVMm

  return {
    columnas,
    anchoRequerido: Number(anchoRequerido.toFixed(2)),
    anchoPagina: config.pageWidthMm,
    altoPagina: Number(altoPagina.toFixed(2)),
    cabe: anchoRequerido <= config.pageWidthMm + 0.01,
    sobraMm: Number(Math.max(0, config.pageWidthMm - anchoRequerido).toFixed(2)),
    posiciones: Array.from(
      { length: columnas },
      (_, indice) => config.marginLeftMm + indice * (config.labelWidthMm + config.gapHMm),
    ),
  }
}

const PT_A_MM = 0.3527778

const redondear = (valor) => Math.round(Number(valor) * 100) / 100

// Medidas internas de UNA etiqueta. Se calculan desde el tamano fisico
// configurado para que la vista previa y la impresion sean identicas.
export function metricasEtiqueta(config) {
  const cfg = normalizarConfig(config)
  const ancho = cfg.labelWidthMm
  const alto = cfg.labelHeightMm
  const marca = String(cfg.brandText || '').trim()
  // 25 mm es solo la referencia tipografica del diseno anterior; la medida
  // fisica real es cfg.labelHeightMm.
  const escala = Math.min(1.25, Math.max(0.85, alto / 25))
  const configuradoPt = Math.min(12, Math.max(7, Number(cfg.fontSizePt) || 9))
  const namePt = configuradoPt * escala
  const nameMinPt = Math.max(6, namePt * 0.68)
  const brandPt = namePt * 0.84
  const rowPt = namePt * 0.94
  const rowMinPt = Math.max(6, rowPt * 0.78)
  // La referencia debe ser legible; se auto-ajusta si el SKU es muy largo.
  const refPt = namePt * 0.76
  const refMinPt = Math.max(5.2, refPt * 0.8)
  const paddingX = Math.min(0.9, Math.max(0.4, ancho * 0.017))
  const paddingY = Math.min(0.6, Math.max(0.3, alto * 0.018))
  // Interlineado 1 para que dos lineas no pierdan el borde inferior por
  // redondeo; el alto reservado deja un pequeno margen de seguridad.
  const altoLineaNombre = namePt * PT_A_MM
  const nameMaxHeightMm = Math.min(alto * 0.33, altoLineaNombre * 2.12)
  const altoFijo =
    paddingY * 2 +
    (marca ? brandPt * PT_A_MM + 0.2 : 0) +
    (cfg.showName ? altoLineaNombre * 2 + 0.2 : 0) +
    (cfg.showPrice || cfg.showSize ? rowPt * PT_A_MM + 0.2 : 0) +
    (cfg.showReference ? refPt * PT_A_MM + 0.05 : 0)
  const barcodeWidthMm = Math.max(
    5,
    Math.min(cfg.barcodeMaxWidthMm, ancho - paddingX * 2),
  )
  // El alto configurado es un maximo; si el texto ocupa mas, el codigo se
  // reduce dentro de la etiqueta sin deformarse.
  const barcodeHeightMax = Math.max(4, Math.min(cfg.barcodeHeightMm, alto * 0.46))
  const barcodeHeightMm = Math.max(4, Math.min(barcodeHeightMax, alto - altoFijo))

  return {
    basePt: redondear(configuradoPt),
    namePt: redondear(namePt),
    nameMinPt: redondear(nameMinPt),
    brandPt: redondear(brandPt),
    rowPt: redondear(rowPt),
    rowMinPt: redondear(rowMinPt),
    refPt: redondear(refPt),
    refMinPt: redondear(refMinPt),
    paddingX: redondear(paddingX),
    paddingY: redondear(paddingY),
    nameMaxHeightMm: redondear(nameMaxHeightMm),
    altoLineaNombre: redondear(altoLineaNombre),
    barcodeWidthMm: redondear(barcodeWidthMm),
    barcodeHeightMm: redondear(barcodeHeightMm),
    barcodeAspect: redondear(barcodeWidthMm / barcodeHeightMm),
  }
}

// Estilos compartidos por la vista previa (React) y la impresion (HTML).
export function estilosEtiqueta(config) {
  const m = metricasEtiqueta(config)

  return {
    label: {
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      padding: `${m.paddingY}mm ${m.paddingX}mm`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#fff',
      color: '#000',
      fontFamily: 'Arial, Helvetica, sans-serif',
      textAlign: 'center',
      lineHeight: 1,
    },
    brand: {
      flex: '0 0 auto',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'clip',
      fontSize: `${m.brandPt}pt`,
      fontWeight: 800,
      letterSpacing: '0.15pt',
      lineHeight: 1,
    },
    name: {
      flex: '0 0 auto',
      minHeight: 0,
      maxHeight: `${m.nameMaxHeightMm}mm`,
      marginTop: '0.2mm',
      overflow: 'hidden',
      fontSize: `${m.namePt}pt`,
      fontWeight: 700,
      lineHeight: 1,
      textAlign: 'center',
      overflowWrap: 'break-word',
      wordBreak: 'break-word',
    },
    row: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: '1mm',
      width: '100%',
      maxWidth: '100%',
      marginTop: '0.2mm',
      overflow: 'hidden',
      fontSize: `${m.rowPt}pt`,
      fontWeight: 700,
      lineHeight: 1,
      textAlign: 'center',
      flex: '0 0 auto',
      whiteSpace: 'nowrap',
    },
    barcode: {
      position: 'relative',
      flex: '1 1 0',
      width: `${m.barcodeWidthMm}mm`,
      maxWidth: '100%',
      minHeight: '5mm',
      maxHeight: '46%',
      margin: '0.2mm auto 0',
      overflow: 'hidden',
      background: '#fff',
    },
    ref: {
      flex: '0 0 auto',
      maxWidth: '100%',
      marginTop: '0.05mm',
      overflow: 'hidden',
      fontFamily: "'Courier New', monospace",
      fontSize: `${m.refPt}pt`,
      lineHeight: 1,
      textAlign: 'center',
      whiteSpace: 'nowrap',
      textOverflow: 'clip',
    },
  }
}

// Ajusta la tipografia solo si el texto no cabe y regenera el codigo con la
// proporcion real de su caja. No recorta datos ni deforma las barras.
export function ajustarEtiqueta(raiz) {
  if (!raiz || typeof window === 'undefined') return

  const mmAPx = 96 / 25.4

  raiz.querySelectorAll('[data-fit="nombre"]').forEach((el) => {
    const maxPt = Number(el.dataset.maxPt) || 9
    const minPt = Number(el.dataset.minPt) || 6
    const maxMm = Number(el.dataset.maxMm) || 7
    const limite = maxMm * mmAPx
    let pt = maxPt

    el.style.maxHeight = `${maxMm}mm`
    el.style.fontSize = `${pt}pt`
    while (pt > minPt && el.scrollHeight > limite + 0.6) {
      pt = Math.max(minPt, Number((pt - 0.2).toFixed(2)))
      el.style.fontSize = `${pt}pt`
    }
    if (el.scrollHeight > limite + 0.6) {
      // Ultimo recurso: permitir una linea extra en lugar de cortar el nombre.
      el.style.maxHeight = `${Number((maxMm + 2.2).toFixed(2))}mm`
    }
  })

  raiz.querySelectorAll('[data-fit="fila"]').forEach((el) => {
    const maxPt = Number(el.dataset.maxPt) || 9
    const minPt = Number(el.dataset.minPt) || 6
    let pt = maxPt

    el.style.fontSize = `${pt}pt`
    while (pt > minPt && el.scrollWidth > el.clientWidth + 0.6) {
      pt = Math.max(minPt, Number((pt - 0.2).toFixed(2)))
      el.style.fontSize = `${pt}pt`
    }
  })

  raiz.querySelectorAll('[data-fit="ref"]').forEach((el) => {
    const maxPt = Number(el.dataset.maxPt) || 6
    const minPt = Number(el.dataset.minPt) || 4.8
    let pt = maxPt

    el.style.whiteSpace = 'nowrap'
    el.style.overflowWrap = 'normal'
    el.style.fontSize = `${pt}pt`
    while (pt > minPt && el.scrollWidth > el.clientWidth + 0.6) {
      pt = Math.max(minPt, Number((pt - 0.2).toFixed(2)))
      el.style.fontSize = `${pt}pt`
    }
    if (el.scrollWidth > el.clientWidth + 0.6) {
      // Si ni al minimo cabe en una linea, se permite partirla antes que cortar.
      el.style.whiteSpace = 'normal'
      el.style.overflowWrap = 'anywhere'
    }
  })

  raiz.querySelectorAll('[data-barcode]').forEach((el) => {
    const ancho = el.clientWidth
    const alto = el.clientHeight
    if (!ancho || !alto) return
    el.innerHTML = barcodeSvg(el.dataset.barcode, { aspect: ancho / alto })
  })
}

const SEDES = [
  { clave: 'aranjuez', codigo: 'AR', nombre: 'Aranjuez' },
  { clave: 'andaluc', codigo: 'AN', nombre: 'Andalucía' },
  { clave: 'akron', codigo: 'AK', nombre: 'Akron' },
  { clave: 'woman', codigo: 'PW', nombre: 'Woman' },
]

export function datosSede(nombre) {
  const texto = String(nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (
    SEDES.find((sede) => texto.includes(sede.clave)) || {
      codigo: '',
      nombre: String(nombre || ''),
    }
  )
}

export function etiquetaSede(nombre) {
  const sede = datosSede(nombre)
  return sede.codigo ? `${sede.codigo}: ${sede.nombre}` : sede.nombre
}

// Código que se codifica en la etiqueta. Se construye con el SKU real y la
// talla para que el escáner pueda identificar la variante exacta.
// Unitalla / Talla única se codifica solo con el SKU, sin sufijo.
export function codigoEtiqueta(producto, variante) {
  const sku = String(producto?.sku || '').trim()
  const talla = String(variante?.talla || '').trim()
  if (sku) return talla && !esTallaUnica(talla) ? `${sku}-${talla}` : sku
  return String(variante?.codigo_barras || '').trim()
}

export function referenciaEtiqueta(producto, variante) {
  const sku = String(producto?.sku || '').trim()
  const talla = String(variante?.talla || '').trim()
  if (sku) {
    return talla && !esTallaUnica(talla)
      ? `${sku} · ${normalizarTallaVisible(talla)}`
      : sku
  }
  return String(variante?.codigo_barras || '').trim() || 'Sin código'
}

// Código corto de la sede para la referencia de la etiqueta: AR, AN, AK, PW.
export function codigoSede(sede) {
  const coincidencia = String(sede || '')
    .trim()
    .match(/^([A-Za-z]{2})\s*:/)
  return coincidencia ? coincidencia[1].toUpperCase() : ''
}

// Marca que va arriba en la etiqueta. Akron usa su propio nombre en vez de
// "PRAGA"; las demás sedes conservan la marca configurada.
export function marcaParaSede(sede) {
  const texto = String(sede || '')
  if (/akron/i.test(texto) || codigoSede(texto) === 'AK') return 'AKRON'
  return ''
}

const barcodeCache = new Map()

// Code128 vectorial. Se genera una sola vez por codigo y proporcion; se centra
// dentro de su area y nunca se estira con preserveAspectRatio="none".
export function barcodeSvg(codigo, { aspect = 3 } = {}) {
  const valor = String(codigo || '').trim()
  if (!valor || typeof document === 'undefined') return ''

  const proporcion = Math.min(8, Math.max(0.8, Number(aspect) || 3))
  // Code128: inicio + datos + checksum + stop. Se usa el peor caso para que
  // las barras aprovechen el alto disponible sin deformarse.
  const modulos = 11 * valor.length + 35
  const anchoUnidades = (modulos + 4) * 2
  const altoUnidades = Math.max(
    40,
    Math.min(240, Math.round(anchoUnidades / proporcion - 4)),
  )
  const clave = `${valor}|${altoUnidades}`
  if (barcodeCache.has(clave)) return barcodeCache.get(clave)

  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svg, valor, {
      format: 'CODE128',
      width: 2,
      height: altoUnidades,
      displayValue: false,
      margin: 2,
      background: '#ffffff',
      lineColor: '#000000',
    })

    // JsBarcode escribe width/height con sufijo "px"; parseFloat evita perder
    // el ancho real y recortar las barras al fijar el viewBox.
    const ancho = parseFloat(svg.getAttribute('width')) || 200
    const alto = parseFloat(svg.getAttribute('height')) || altoUnidades
    svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`)
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.setAttribute(
      'style',
      'position:absolute;inset:0;width:100%;height:100%;display:block;shape-rendering:crispEdges',
    )
    svg.setAttribute('shape-rendering', 'crispEdges')
    svg.setAttribute('focusable', 'false')
    const markup = svg.outerHTML
    barcodeCache.set(clave, markup)
    return markup
  } catch {
    return ''
  }
}

export function crearSticker({ producto, variante, sede, precio, grupo, totalGrupos }) {
  return {
    nombre: producto?.nombre || 'Producto',
    sku: String(producto?.sku || '').trim(),
    talla: normalizarTallaVisible(variante?.talla) || 'Unitalla',
    precio: Number(precio ?? producto?.precio ?? 0),
    sede,
    sedeCodigo: codigoSede(sede),
    marca: marcaParaSede(sede),
    grupo,
    totalGrupos,
    codigo: codigoBarrasProducto({
      sku: producto?.sku,
      talla: variante?.talla,
      codigo_barras: variante?.codigo_barras,
      id: variante?.id,
      variante_id: variante?.variante_id,
    }),
    referencia: referenciaEtiqueta(producto, variante),
    codigoLegacy: !String(producto?.sku || '').trim(),
  }
}

// Crea las etiquetas de un producto. Por defecto genera una por variante; si
// se pasa `cantidadDe`, repite la etiqueta según las unidades con stock para
// que cada unidad física tenga su propio sticker.
export function crearStickersProducto({
  producto,
  variantes = [],
  sede,
  precio,
  grupo,
  totalGrupos,
  cantidadDe,
}) {
  const lista =
    typeof cantidadDe === 'function'
      ? variantes.flatMap((variante) => {
          const cantidad = Math.max(0, Math.floor(Number(cantidadDe(variante)) || 0))
          return Array.from({ length: cantidad }, () => variante)
        })
      : variantes

  return lista.map((variante) =>
    crearSticker({ producto, variante, sede, precio, grupo, totalGrupos }),
  )
}

// Devuelve las filas que se imprimiran, siempre de 3 columnas y en flujo
// continuo: izquierda a derecha y luego la fila siguiente. No se rellena con
// huecos para no desperdiciar espacios del rollo.
export function construirPaginas(stickers) {
  if (!stickers?.length) return []

  const filas = []
  for (let i = 0; i < stickers.length; i += COLUMNAS_ETIQUETA) {
    filas.push(stickers.slice(i, i + COLUMNAS_ETIQUETA))
  }
  return filas
}

export function imprimirStickers({ stickers, config = DEFAULT_CONFIG }) {
  if (!stickers?.length) return false

  const cfg = normalizarConfig(config)
  const layout = calcularPagina(cfg)
  if (!layout.cabe) return false

  const paginas = construirPaginas(stickers)
  if (!paginas.length) return false

  const metricas = metricasEtiqueta(cfg)
  const estilos = estilosEtiqueta(cfg)
  const perfil = cargarPerfilImpresora()
  const offsetX = Number(perfil.offsetXMm) || 0
  const offsetY = Number(perfil.offsetYMm) || 0
  // El ajuste fino mueve la cuadricula dentro de la pagina sin cambiar el
  // tamano de la hoja: se compensa en el padding opuesto.
  const paddingLeft = Math.max(0, cfg.marginLeftMm + offsetX)
  const paddingRight = Math.max(0, cfg.marginRightMm - offsetX)
  const paddingTop = Math.max(0, cfg.marginTopMm + offsetY)
  const paddingBottom = Math.max(0, cfg.marginBottomMm - offsetY)

  const formato = (n) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n)
  const escapar = (valor) =>
    String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  // Convierte un objeto de estilos de React a atributo CSS para el HTML.
  const aCss = (objeto) =>
    Object.entries(objeto)
      .map(
        ([clave, valor]) =>
          `${clave.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)}:${valor}`,
      )
      .join(';')

  const htmlEtiqueta = (sticker) => {
    if (!sticker) return ''
    const marca = String(sticker.marca || cfg.brandText || '').trim()
    // En Akron la marca ya dice AKRON; no se repite el código AK.
    const mostrarCodigoSede = cfg.showSede && !sticker.marca
    const marcaTexto = [marca, mostrarCodigoSede ? sticker.sedeCodigo : '']
      .filter(Boolean)
      .join(' · ')
    const referencia = sticker.referencia

    return `<div class="label" style="${aCss(estilos.label)}">
      ${marcaTexto ? `<div style="${aCss(estilos.brand)}">${escapar(marcaTexto)}</div>` : ''}
      ${
        cfg.showName
          ? `<div data-fit="nombre" data-min-pt="${metricas.nameMinPt}" data-max-pt="${metricas.namePt}" data-max-mm="${metricas.nameMaxHeightMm}" style="${aCss(estilos.name)}">${escapar(sticker.nombre)}</div>`
          : ''
      }
      ${
        cfg.showPrice || cfg.showSize
          ? `<div data-fit="fila" data-min-pt="${metricas.rowMinPt}" data-max-pt="${metricas.rowPt}" style="${aCss(estilos.row)}">${cfg.showSize ? `<span>${escapar(sticker.talla)}</span>` : ''}${cfg.showPrice ? `<span>${escapar(formato(sticker.precio))}</span>` : ''}</div>`
          : ''
      }
      <div data-barcode="${escapar(sticker.codigo)}" style="${aCss(estilos.barcode)}">${barcodeSvg(sticker.codigo, { aspect: metricas.barcodeAspect })}</div>
      ${
        cfg.showReference
          ? `<div data-fit="ref" data-min-pt="${metricas.refMinPt}" data-max-pt="${metricas.refPt}" style="${aCss(estilos.ref)}">${escapar(referencia)}</div>`
          : ''
      }
    </div>`
  }

  // Cada fila es una hoja con el ancho configurado (98 mm por defecto) y
  // exactamente 3 celdas independientes. La ultima fila puede tener 1 o 2
  // celdas; las restantes quedan vacias.
  const htmlPaginas = paginas
    .map(
      (fila) =>
        `<div class="print-sheet">${fila
          .map((sticker) => `<div class="label-cell">${htmlEtiqueta(sticker)}</div>`)
          .join('')}</div>`,
    )
    .join('')

  const overlayId = 'praga-label-print-overlay'
  const styleId = 'praga-label-print-style'

  // Se elimina una impresión anterior si quedó abierta.
  document.getElementById(overlayId)?.remove()
  document.getElementById(styleId)?.remove()

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    @page { size: ${cfg.pageWidthMm}mm ${layout.altoPagina}mm; margin: 0; }
    #${overlayId} {
      position: fixed;
      left: -20000mm;
      top: 0;
      width: ${cfg.pageWidthMm}mm;
      visibility: hidden;
    }
    #${overlayId}, #${overlayId} * { box-sizing: border-box; }
    #${overlayId} .print-sheet {
      display: grid;
      grid-template-columns: repeat(${COLUMNAS_ETIQUETA}, ${cfg.labelWidthMm}mm);
      grid-auto-rows: ${cfg.labelHeightMm}mm;
      column-gap: ${cfg.gapHMm}mm;
      row-gap: ${cfg.gapVMm}mm;
      width: ${cfg.pageWidthMm}mm;
      height: ${layout.altoPagina}mm;
      padding: ${paddingTop}mm ${paddingRight}mm ${paddingBottom}mm ${paddingLeft}mm;
      overflow: hidden;
      background: #fff;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    #${overlayId} .print-sheet:last-child { page-break-after: auto; break-after: auto; }
    #${overlayId} .label-cell {
      width: ${cfg.labelWidthMm}mm;
      height: ${cfg.labelHeightMm}mm;
      overflow: hidden;
      background: #fff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media print {
      html, body {
        width: ${cfg.pageWidthMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body > *:not(#${overlayId}) { display: none !important; }
      #${overlayId} {
        position: static !important;
        left: auto !important;
        top: auto !important;
        visibility: visible !important;
        width: ${cfg.pageWidthMm}mm;
      }
      #${overlayId} .print-sheet {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .no-print { display: none !important; }
    }
  `

  const overlay = document.createElement('div')
  overlay.id = overlayId
  overlay.setAttribute('aria-hidden', 'true')
  overlay.innerHTML = htmlPaginas
  document.head.appendChild(style)
  document.body.appendChild(overlay)

  // Se mide con el layout real (aunque este fuera de pantalla) para ajustar
  // textos y regenerar el codigo con la proporcion exacta de su caja.
  ajustarEtiqueta(overlay)

  const antes = document.title
  document.title = ''
  let limpiado = false
  let impreso = false
  const limpiar = () => {
    if (limpiado) return
    limpiado = true
    document.title = antes
    document.getElementById(overlayId)?.remove()
    document.getElementById(styleId)?.remove()
    window.removeEventListener('afterprint', limpiar)
  }

  // Documento de impresion independiente: no hereda estilos, reglas @page ni
  // transformaciones del panel. El contenido ya fue medido y ajustado.
  const htmlDocumento = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title></title>
<style>
${style.textContent}
</style>
</head>
<body>
<div id="${overlayId}">${overlay.innerHTML}</div>
<script>
  (function () {
    var impreso = false;
    function imprimir() {
      if (impreso) return;
      impreso = true;
      window.focus();
      window.print();
    }
    function lanzar() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          requestAnimationFrame(function () {
            requestAnimationFrame(imprimir);
          });
        }).catch(imprimir);
        setTimeout(imprimir, 1500);
      } else {
        requestAnimationFrame(function () {
          requestAnimationFrame(imprimir);
        });
      }
    }
    window.addEventListener('afterprint', function () {
      setTimeout(function () { window.close(); }, 300);
    });
    lanzar();
  })();
</script>
</body>
</html>`

  // Se abre una ventana limpia desde el clic del usuario. Si el navegador la
  // bloquea, se conserva el fallback del overlay en la pagina principal.
  const ventana = window.open('', '_blank', 'width=900,height=600')
  if (ventana) {
    try {
      ventana.document.open()
      ventana.document.write(htmlDocumento)
      ventana.document.close()
      ventana.focus()
      limpiar()
      return true
    } catch {
      try {
        ventana.close()
      } catch {
        /* ignore */
      }
    }
  }

  window.addEventListener('afterprint', limpiar, { once: true })
  // Si el navegador no dispara afterprint, se limpia después.
  setTimeout(limpiar, 60000)

  const imprimir = () => {
    if (limpiado || impreso) return
    impreso = true
    // Se repite el ajuste con las fuentes ya cargadas antes de abrir el dialogo.
    ajustarEtiqueta(document.getElementById(overlayId))
    requestAnimationFrame(() => {
      if (!limpiado) window.print()
    })
  }
  if (document.fonts?.ready) {
    document.fonts.ready
      .then(() => requestAnimationFrame(imprimir))
      .catch(() => requestAnimationFrame(imprimir))
    // Respaldo por si la carga de fuentes nunca resuelve.
    setTimeout(imprimir, 1500)
  } else {
    requestAnimationFrame(imprimir)
  }
  return true
}

// Guía de pegado en papel normal (A4), separada de los stickers.
export function imprimirGuiaStickers({ categoria, sede, grupos }) {
  if (!grupos?.length) return false

  const escapar = (valor) =>
    String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const totalEtiquetas = grupos.reduce((suma, grupo) => suma + grupo.total, 0)
  const fecha = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const filas = grupos
    .map((grupo) => {
      const tallas = (grupo.tallas || [])
        .map((t) => `${escapar(t.talla)} × ${t.cantidad}`)
        .join(' · ')
      const imagen = grupo.producto?.imagen_url
        ? `<img src="${escapar(grupo.producto.imagen_url)}" alt="" />`
        : '<span class="sin-foto">—</span>'

      return `
        <tr>
          <td class="numero">
            <b>#${grupo.numero}</b>
            <small>${grupo.desde}–${grupo.hasta}</small>
          </td>
          <td class="foto">${imagen}</td>
          <td class="producto">
            <b>${escapar(grupo.producto?.nombre || 'Producto')}</b>
            <small>${escapar(grupo.producto?.sku || '—')} · ${grupo.total} ${
              grupo.total === 1 ? 'etiqueta' : 'etiquetas'
            }</small>
          </td>
          <td class="tallas">${tallas || '—'}</td>
          <td class="total">${grupo.total}</td>
          <td class="hecho"><span class="caja"></span></td>
        </tr>`
    })
    .join('')

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Guía de pegado · ${escapar(categoria || 'Categoría')}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8mm; border-bottom: 1.5px solid #111; padding-bottom: 4mm; margin-bottom: 5mm; }
  h1 { margin: 0; font-size: 19pt; letter-spacing: -0.3pt; }
  .subtitulo { margin-top: 1mm; font-size: 10pt; color: #444; }
  .meta { text-align: right; font-size: 8.5pt; color: #444; line-height: 1.45; }
  .instruccion { margin: 0 0 5mm; padding: 3mm 4mm; border: 1px solid #ccc; background: #f7f7f7; font-size: 9pt; line-height: 1.4; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { border-bottom: 1.5px solid #111; padding: 2mm 1.5mm; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.4pt; text-align: left; }
  td { border-bottom: 1px solid #ddd; padding: 2mm 1.5mm; vertical-align: middle; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th:nth-child(1), td:nth-child(1) { width: 13mm; }
  th:nth-child(2), td:nth-child(2) { width: 18mm; }
  th:nth-child(3), td:nth-child(3) { width: 60mm; }
  th:nth-child(4), td:nth-child(4) { width: 58mm; }
  th:nth-child(5), td:nth-child(5) { width: 14mm; text-align: center; }
  th:nth-child(6), td:nth-child(6) { width: 14mm; text-align: center; }
  .numero b { display: block; font-size: 12pt; }
  .numero small { display: block; margin-top: 0.5mm; color: #666; font-size: 6.5pt; }
  .foto img { width: 13mm; height: 13mm; object-fit: cover; border: 1px solid #ddd; display: block; }
  .sin-foto { color: #aaa; font-size: 13pt; }
  .producto b { display: block; font-size: 9.5pt; line-height: 1.2; }
  .producto small { display: block; margin-top: 0.7mm; color: #666; font-size: 7.5pt; }
  .tallas { font-size: 8.5pt; line-height: 1.35; }
  .total { font-weight: 700; font-size: 12pt; text-align: center; }
  .hecho { text-align: center; }
  .hecho .caja { display: inline-block; width: 4mm; height: 4mm; border: 0.4mm solid #555; vertical-align: middle; }
  footer { margin-top: 6mm; color: #666; font-size: 8pt; line-height: 1.4; }
  @page { size: A4 portrait; margin: 10mm; }
</style>
</head>
<body>
  <header>
    <div>
      <h1>Guía de pegado</h1>
      <p class="subtitulo">${escapar(categoria || 'Categoría')} · ${escapar(sede || 'Sede')}</p>
      <p class="subtitulo">El orden es el mismo de la web y de los stickers.</p>
    </div>
    <div class="meta">
      <div>${escapar(fecha)}</div>
      <div>${grupos.length} ${grupos.length === 1 ? 'producto' : 'productos'} · ${totalEtiquetas} etiquetas</div>
    </div>
  </header>
  <p class="instruccion">Imprime primero esta guía y luego los stickers. Se genera una etiqueta por cada unidad con stock (si una talla tiene 2 unidades, salen 2 stickers). Pega un producto completo antes de pasar al siguiente. El número <b>#</b> es solo el orden interno de esta guía; los stickers muestran el código de sede (AR/AN/AK/PW) junto a la marca y no llevan número de grupo. Marca la casilla cuando termines ese producto.</p>
  <table>
    <thead><tr><th>#</th><th>Foto</th><th>Producto / SKU</th><th>Stock por talla</th><th>Etiquetas</th><th>Hecho</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <footer>Total: ${totalEtiquetas} ${totalEtiquetas === 1 ? 'sticker' : 'stickers'} en ${grupos.length} ${grupos.length === 1 ? 'grupo' : 'grupos'} (una etiqueta por unidad con stock). Si una etiqueta no coincide con el producto de la guía, revisa el nombre, la talla y el código antes de pegarla.</footer>
  <script>
    window.addEventListener('load', function () {
      var imagenes = Array.prototype.slice.call(document.images);
      var listas = imagenes.map(function (img) {
        if (img.complete) return Promise.resolve();
        return new Promise(function (resolve) {
          img.onload = resolve;
          img.onerror = function () { img.style.visibility = 'hidden'; resolve(); };
        });
      });
      var impreso = false;
      function imprimirGuia() { if (impreso) return; impreso = true; window.print(); }
      Promise.all(listas).then(function () { setTimeout(imprimirGuia, 220); });
      setTimeout(imprimirGuia, 2500);
    });
  </script>
</body>
</html>`

  const ventana = window.open('', '_blank', 'width=900,height=760')
  if (!ventana) return false
  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()
  ventana.focus()
  return true
}
