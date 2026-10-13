// Simulador del backend de la tienda pública (misma forma que la API real).
import { categorias, productos, subcategorias } from './mockData'

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

async function getCategorias() {
  await delay()
  return categorias
}

async function getSubcategorias() {
  await delay()
  return subcategorias
}

// Listado público: agrega categoría/subcategoría y solo variantes con stock.
function conDetalle(p) {
  const cat = categorias.find((c) => c.id === p.categoria_id)
  const precio = Number(p.precio)
  const precioAntes = p.precio_antes ? Number(p.precio_antes) : null
  const esOferta = precioAntes !== null && precioAntes > precio
  return {
    ...p,
    precio,
    precio_antes: precioAntes,
    es_oferta: esOferta,
    descuento: esOferta ? Math.round(((precioAntes - precio) / precioAntes) * 100) : null,
    categoria: cat ? cat.nombre : null,
    catalogo: cat ? cat.catalogo : null,
    subcategoria: subcategorias.find((s) => s.id === p.subcategoria_id)?.nombre || null,
    imagenes: p.imagenes && p.imagenes.length ? p.imagenes : p.imagen_url ? [p.imagen_url] : [],
    variantes: p.variantes.filter((v) => v.stock > 0),
    stock_total: p.variantes.reduce((sum, v) => sum + v.stock, 0),
  }
}

async function getProductos({ categoria_id, subcategoria_id, destacados, catalogo, q, limit, offset, en_oferta } = {}) {
  await delay()
  let lista = productos
  if (destacados) lista = lista.filter((p) => p.destacado)
  if (en_oferta) {
    lista = lista.filter((p) => p.precio_antes && Number(p.precio_antes) > Number(p.precio))
  }
  if (catalogo) {
    const ids = categorias.filter((c) => c.catalogo === catalogo).map((c) => c.id)
    lista = lista.filter((p) => ids.includes(p.categoria_id))
  }
  if (categoria_id) lista = lista.filter((p) => p.categoria_id === Number(categoria_id))
  if (subcategoria_id) lista = lista.filter((p) => p.subcategoria_id === Number(subcategoria_id))
  if (q) {
    const term = q.trim().toLowerCase()
    lista = lista.filter((p) => p.nombre.toLowerCase().includes(term))
  }
  const inicio = Number(offset) || 0
  if (limit) lista = lista.slice(inicio, inicio + Number(limit))
  return lista.map(conDetalle)
}

async function getProducto(id) {
  await delay()
  const p = productos.find((x) => x.id === Number(id))
  if (!p) throw new Error('Producto no encontrado')
  return conDetalle(p)
}

// Pedido simulado (misma forma que el real: recibe variante_id + cantidad; el
// total se recalcula con el precio real del catálogo).
async function createPedido({ cliente, items }) {
  await delay()
  const snapshot = items.map((it) => {
    const v = variantes.find(
      (x) => x.producto_id === Number(it.producto_id) && x.talla === (it.talla || null),
    )
    const p = productos.find((pr) => pr.id === Number(it.producto_id))
    const precio = Number(p?.precio) || 0
    const cant = Number(it.cantidad) || 1
    return {
      variante_id: v ? v.id : null,
      producto_id: Number(it.producto_id),
      nombre: p ? p.nombre : `Producto ${it.producto_id}`,
      talla: v ? v.talla : (it.talla ?? null),
      sku: p ? p.sku : null,
      codigo_barras: v ? v.codigo_barras : null,
      imagen_url: p ? p.imagen_url : null,
      cantidad: cant,
      precio_unitario: precio,
      subtotal: precio * cant,
    }
  })
  const total = snapshot.reduce((s, i) => s + i.subtotal, 0)
  const numero = `PD-${String(Date.now()).slice(-6)}`
  return {
    id: 1,
    numero,
    referencia: numero,
    fecha: new Date().toISOString(),
    total,
    estado: 'nuevo',
    payment_status: null,
    wompi_transaction_id: null,
    metodo_pago: null,
    franquicia: null,
    cliente: {
      nombre: cliente?.nombre || '',
      email: cliente?.email || null,
      telefono: cliente?.telefono || null,
      direccion: cliente?.direccion || null,
      ciudad: cliente?.ciudad || 'Medellín',
      documento: cliente?.documento || null,
    },
    items: snapshot,
  }
}

// Config del widget en modo mock (para no romper el VITE_USE_MOCK=true).
async function pedidoWompi(numero) {
  await delay(150)
  return {
    public_key: 'pub_test_mock',
    reference: numero,
    amount_in_cents: 1,
    currency: 'COP',
    signature: 'mock-signature',
    widget_url: 'https://checkout.wompi.co/widget.js',
    base_url: 'https://sandbox.wompi.co/v1',
  }
}

async function confirmarPedido(numero, { wompi_transaction_id }) {
  await delay(250)
  if (!wompi_transaction_id) throw new Error('Falta el id de transacción')
  return {
    id: 1,
    numero,
    referencia: numero,
    fecha: new Date().toISOString(),
    total: 1,
    estado: 'pagado',
    payment_status: 'APPROVED',
    wompi_transaction_id,
    metodo_pago: 'tarjeta',
    franquicia: 'VISA',
    cliente: { nombre: 'Cliente' },
    items: [],
  }
}

export default {
  getCategorias,
  getSubcategorias,
  getProductos,
  getProducto,
  createPedido,
  pedidoWompi,
  confirmarPedido,
}