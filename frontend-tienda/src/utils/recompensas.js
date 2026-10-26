// Reglas de recompensas de la tienda (deben espejar las del backend
// PedidoController). Sobre el subtotal de productos (Σ precio×cantidad):
//   - Envío gratis desde $400.000.
//   - Fragancia Exclusiva de regalo al superar el ancla + $100.000.
//   - 5% de descuento al superar el ancla + $300.000 (+$100.000 fragancia + $200.000 descuento).
// El ancla es el mayor PRECIO UNITARIO del carrito si supera $400.000; si ningún
// producto supera $400.000 por unidad, el ancla es $400.000.

export const ENVIO_GRATIS_DESDE = 400000
export const FRAGANCIA_DELTA = 100000
export const DESCUENTO_DELTA = 300000
export const PORCENTAJE_DESCUENTO = 5

export function calcularRecompensas(items = []) {
  const subtotal = items.reduce((s, i) => s + (i.precio || 0) * (i.cantidad || 0), 0)
  const mayorPrecio = items.reduce((m, i) => Math.max(m, i.precio || 0), 0)

  const ancla = Math.max(ENVIO_GRATIS_DESDE, mayorPrecio)
  const envio_gratis = subtotal >= ENVIO_GRATIS_DESDE
  const fragancia_gratis = subtotal >= ancla + FRAGANCIA_DELTA
  const descuento_5 = subtotal >= ancla + DESCUENTO_DELTA
  const descuento = descuento_5 ? Math.round((subtotal * PORCENTAJE_DESCUENTO) / 100) : 0
  const total = subtotal - descuento

  const metas = [
    { id: 'envio', titulo: 'Envío gratis', meta: ENVIO_GRATIS_DESDE, alcanzada: envio_gratis },
    {
      id: 'fragancia',
      titulo: 'Fragancia Exclusiva de regalo',
      meta: ancla + FRAGANCIA_DELTA,
      alcanzada: fragancia_gratis,
    },
    {
      id: 'descuento',
      titulo: '5% de descuento',
      meta: ancla + DESCUENTO_DELTA,
      alcanzada: descuento_5,
    },
  ]

  return { subtotal, ancla, envio_gratis, fragancia_gratis, descuento_5, descuento, total, metas }
}
