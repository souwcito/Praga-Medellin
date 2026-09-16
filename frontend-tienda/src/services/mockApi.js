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
  return {
    ...p,
    categoria: categorias.find((c) => c.id === p.categoria_id)?.nombre || null,
    subcategoria: subcategorias.find((s) => s.id === p.subcategoria_id)?.nombre || null,
    variantes: p.variantes.filter((v) => v.stock > 0),
    stock_total: p.variantes.reduce((sum, v) => sum + v.stock, 0),
  }
}

async function getProductos({ categoria_id, subcategoria_id, destacados } = {}) {
  await delay()
  let lista = productos
  if (destacados) lista = lista.filter((p) => p.destacado)
  if (categoria_id) lista = lista.filter((p) => p.categoria_id === Number(categoria_id))
  if (subcategoria_id) lista = lista.filter((p) => p.subcategoria_id === Number(subcategoria_id))
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