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

// Pedido simulado (cuando exista el backend, será POST /api/pedidos).
async function createPedido({ items, cliente, total }) {
  await delay()
  const numero = `PD-${String(Date.now()).slice(-6)}`
  return {
    numero,
    estado: 'aprobado',
    total,
    items,
    cliente,
    fecha: new Date().toISOString(),
  }
}

export default {
  getCategorias,
  getSubcategorias,
  getProductos,
  getProducto,
  createPedido,
}