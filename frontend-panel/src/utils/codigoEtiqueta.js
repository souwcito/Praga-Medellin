// Código que se imprime en la etiqueta y que debe encontrar el escáner.
// El texto visible se deriva del SKU real + talla. El código de barras usa un
// valor corto (numérico guardado, código corto o V{id}) porque la etiqueta de
// 30 x 20 mm y la impresora de 203 dpi no resuelven un SKU-TALLA largo.
import { normalizarTallaVisible } from './tallas.js'

// Normaliza un texto para comparar códigos escaneados: quita tildes, recorta
// espacios y unifica separadores. No cambia el significado del código.
const normalizarTexto = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Deja el código en un formato que Code128 puede imprimir y que el lector
// devuelve sin sorpresas. Se conservan letras, números, punto, guion, guion
// bajo y barra (tallas como S/M o L/XL); el resto se convierte en guion.
export function normalizarCodigo(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s*\/\s*/g, '/')
    .replace(/[^A-Za-z0-9._/-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
}

// Unitalla / Talla única no lleva sufijo: el código es solamente el SKU.
export function esTallaUnica(talla) {
  const texto = normalizarTexto(talla)

  return (
    texto === '' ||
    texto === 'unica' ||
    texto === 'unico' ||
    texto === 'unitalla' ||
    texto === 'talla unica' ||
    texto === 'talla unico' ||
    texto === 'talla unitalla'
  )
}

export function codigoEtiquetaProducto(variante) {
  const sku = normalizarCodigo(variante?.sku)
  const talla = normalizarCodigo(variante?.talla)
  if (sku) return talla && !esTallaUnica(talla) ? `${sku}-${talla}` : sku
  return normalizarCodigo(variante?.codigo_barras)
}

export function referenciaEtiquetaProducto(variante) {
  const sku = String(variante?.sku || '').trim()
  const talla = String(variante?.talla || '').trim()
  if (sku) {
    return talla && !esTallaUnica(talla)
      ? `${sku} · ${normalizarTallaVisible(talla)}`
      : sku
  }
  return String(variante?.codigo_barras || '').trim()
}

// Código corto y único por variante. Solo se usa como último recurso cuando el
// código real no existe o no cabe en la etiqueta de 30 x 20 mm.
export function codigoCortoProducto(variante) {
  const id = variante?.variante_id ?? variante?.id
  return id ? `V${id}` : ''
}

// Longitud máxima de un código alfanumérico para que las barras sigan siendo
// legibles en la etiqueta de 30 x 20 mm con impresoras de 203 dpi. Un código
// largo (SKU-TALLA) hace las barras demasiado delgadas y el lector no lo lee.
const MAX_CODIGO_CORTO = 6
// Los códigos numéricos se comprimen en Code128-C y se leen bien aunque tengan
// más caracteres; se aceptan hasta 14 dígitos.
const CODIGO_NUMERICO = /^\d{4,14}$/

// Contenido que se imprime en el código de barras. En la etiqueta de 30 x 20
// mm se usa SIEMPRE el código corto único de la variante (V{id}) para que:
// - las barras sean anchas y el lector las lea de una;
// - no haya dos productos/tallas con el mismo código;
// - el POS y las búsquedas encuentren una sola variante.
// El texto de la etiqueta sigue mostrando el SKU y la talla reales.
export function codigoBarrasProducto(variante) {
  const corto = codigoCortoProducto(variante)
  if (corto) return corto

  // Respaldo para variantes sin id (por ejemplo, una vista previa sin guardar).
  const guardado = normalizarCodigo(variante?.codigo_barras)
  const generado = codigoEtiquetaProducto(variante)
  if (CODIGO_NUMERICO.test(guardado)) return guardado
  if (guardado && guardado.length <= MAX_CODIGO_CORTO) return guardado
  if (generado && generado.length <= MAX_CODIGO_CORTO) return generado
  return guardado || generado
}

// Todos los códigos con los que se puede identificar una variante, ya
// normalizados y sin repetidos. Incluye el código corto antiguo (V{id}) para
// que los stickers ya impresos sigan funcionando. No incluye el SKU suelto en
// variantes con talla: ese SKU lo comparten todas las tallas y no identifica
// una variante exacta (para buscarlo se usa `coincideCodigoEtiqueta`).
export function codigosVariante(variante) {
  const lista = [
    variante?.codigo_barras,
    codigoEtiquetaProducto(variante),
    codigoBarrasProducto(variante),
    codigoCortoProducto(variante),
  ]
  return [...new Set(lista.map(normalizarCodigo).filter(Boolean))]
}

// Busca la variante exacta de un código escaneado (barras impresas, SKU-talla
// o código corto V{id}). Devuelve null si no hay coincidencia exacta.
export function buscarVariantePorCodigo(variantes, busqueda) {
  const q = normalizarCodigo(busqueda).toLowerCase()
  if (!q) return null
  return (
    variantes.find((v) =>
      codigosVariante(v).some((codigo) => codigo.toLowerCase() === q),
    ) || null
  )
}

// Coincidencia exacta con alguno de los códigos de la variante. Se usa para
// que un código escaneado muestre solo la variante correcta y no otras que
// contengan el mismo texto (V99 frente a V990, por ejemplo).
export function coincideCodigoExacto(variante, busqueda) {
  const q = normalizarCodigo(busqueda).toLowerCase()
  if (!q) return false
  return codigosVariante(variante).some(
    (codigo) => codigo.toLowerCase() === q,
  )
}

// Los códigos cortos V{id} son únicos por variante. La búsqueda de un código
// corto debe ser exacta: V99 no debe traer V990, V991, etc.
const CODIGO_CORTO_EXACTO = /^v\d+$/

// Búsqueda tolerante: acepta el código guardado, el código SKU-TALLA, el
// código corto de la variante, el SKU suelto y coincidencias parciales.
// Para V{id} solo vale la coincidencia exacta.
export function coincideCodigoEtiqueta(variante, busqueda) {
  const q = normalizarCodigo(busqueda).toLowerCase()
  if (!q) return true

  const candidatos = [...codigosVariante(variante), normalizarCodigo(variante?.sku)]
  if (candidatos.some((codigo) => codigo && codigo.toLowerCase() === q)) return true

  if (CODIGO_CORTO_EXACTO.test(q)) return false

  return candidatos.some((codigo) => {
    if (!codigo) return false
    return codigo.toLowerCase().includes(q)
  })
}
