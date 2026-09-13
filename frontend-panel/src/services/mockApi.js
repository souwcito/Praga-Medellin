// Simulador del backend: devuelve promesas con la misma forma que responderá la API real.
// Se usa solo cuando VITE_USE_MOCK=true (ver services/api.js).

import {
  categorias,
  detalleVentas,
  empleados,
  facturas,
  inventario,
  productos,
  sedes,
  subcategorias,
  ventas,
} from './mockData'

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

// Cuenta única del panel. Los vendedores son datos para facturar, no cuentas de acceso.
const ADMIN = { email: 'admin@praga.co', password: 'admin123', nombre: 'Administrador' }

// La numeración de factura continúa donde terminan las facturas simuladas.
let facturaCounter = 1000 + facturas.length

async function login({ email, password }) {
  await delay()
  if (String(email).toLowerCase() === ADMIN.email && String(password) === ADMIN.password) {
    return {
      token: `mock-token-${Date.now()}`,
      user: { id: 0, nombre: ADMIN.nombre, email: ADMIN.email, rol: 'admin' },
    }
  }
  throw new Error('Credenciales incorrectas')
}

async function getSedes() {
  await delay()
  return sedes
}

async function getEmpleados() {
  await delay()
  // Sin email/password: solo lo que necesita el POS y las comisiones
  return empleados.map((e) => {
    const sede = sedes.find((s) => s.id === e.sede_id)
    return {
      id: e.id,
      nombre: e.nombre,
      rol: e.rol,
      sede_id: e.sede_id,
      sede_nombre: sede ? sede.nombre : null,
    }
  })
}

// Productos con stock > 0 en la sede elegida: el POS solo vende stock de esa sede.
async function getInventario({ sede_id }) {
  await delay()
  return inventario
    .filter((i) => i.sede_id === Number(sede_id) && i.cantidad > 0)
    .map((i) => {
      const p = productos.find((pr) => pr.id === i.producto_id)
      return {
        producto_id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        sku: p.sku,
        codigo_barras: p.codigo_barras,
        imagen_url: p.imagen_url,
        stock: i.cantidad,
      }
    })
}

// Registra la venta: valida/descarta stock de la sede de venta, crea Venta + DetalleVenta
// y genera la factura interna (numero_interno). La comisión se registra más adelante
// cuando se defina la regla exacta (pendiente con el socio).
async function createVenta(body) {
  await delay()

  const { empleado_id, sede_venta_id, tipo, items } = body
  if (!empleado_id || !sede_venta_id || !Array.isArray(items) || items.length === 0) {
    throw new Error('Faltan datos para registrar la venta')
  }

  const detalle = items.map((item) => {
    const reg = inventario.find(
      (i) => i.sede_id === Number(sede_venta_id) && i.producto_id === item.producto_id,
    )
    if (!reg || reg.cantidad < item.cantidad) {
      throw new Error(`Stock insuficiente en la sede para el producto ${item.producto_id}`)
    }
    // Descuento el stock de la sede de la que sale el producto
    reg.cantidad -= item.cantidad
    return {
      producto_id: item.producto_id,
      sede_stock_id: Number(sede_venta_id),
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
    }
  })

  const total = detalle.reduce((sum, d) => sum + d.cantidad * d.precio_unitario, 0)

  const venta = {
    id: ventas.length + 1,
    empleado_id: Number(empleado_id),
    sede_venta_id: Number(sede_venta_id),
    tipo,
    fecha: new Date().toISOString(),
    total,
  }
  detalle.forEach((d) => (d.venta_id = venta.id))
  ventas.push(venta)
  detalleVentas.push(...detalle)

  const numero_interno = `FAC-${String(++facturaCounter).padStart(4, '0')}`
  const factura = { venta_id: venta.id, numero_interno, fecha: venta.fecha }
  facturas.push(factura)

  const sede = sedes.find((s) => s.id === venta.sede_venta_id)
  const vendedor = empleados.find((e) => e.id === venta.empleado_id)

  return {
    venta,
    factura,
    items: detalle.map((d) => {
      const p = productos.find((pr) => pr.id === d.producto_id)
      return {
        producto_id: d.producto_id,
        nombre: p ? p.nombre : `Producto ${d.producto_id}`,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.cantidad * d.precio_unitario,
      }
    }),
    sede: sede ? sede.nombre : null,
    vendedor: vendedor ? vendedor.nombre : null,
    total,
  }
}

// Inicio del periodo según el filtro: dia=hoy, semana=últimos 7 días, mes=últimos 30.
function inicioPeriodo(periodo) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const dias = periodo === 'dia' ? 0 : periodo === 'semana' ? 6 : 29
  d.setDate(d.getDate() - dias)
  return d
}

// Resumen del Dashboard: totales, desglose por sede, top productos y empleado destacado.
async function getDashboard({ periodo = 'mes' } = {}) {
  await delay()

  const inicio = inicioPeriodo(periodo)
  const filtradas = ventas.filter((v) => new Date(v.fecha) >= inicio)

  const total = filtradas.reduce((sum, v) => sum + v.total, 0)
  const numVentas = filtradas.length
  const ticketPromedio = numVentas ? Math.round(total / numVentas) : 0

  // Desglose por las 4 sedes
  const totalPorSede = sedes.map((s) => ({
    sede_id: s.id,
    sede: s.nombre,
    total: filtradas
      .filter((v) => v.sede_venta_id === s.id)
      .reduce((sum, v) => sum + v.total, 0),
  }))

  // Productos más vendidos por cantidad de unidades en el periodo
  const conteo = {}
  detalleVentas.forEach((d) => {
    if (!filtradas.some((v) => v.id === d.venta_id)) return
    conteo[d.producto_id] = (conteo[d.producto_id] || 0) + d.cantidad
  })
  const productosMasVendidos = Object.entries(conteo)
    .map(([producto_id, cantidad]) => {
      const p = productos.find((pr) => pr.id === Number(producto_id))
      return { producto: p ? p.nombre : `Producto ${producto_id}`, cantidad }
    })
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)

  // Empleado con más ventas (por total) del periodo
  const porEmpleado = {}
  filtradas.forEach((v) => {
    if (!porEmpleado[v.empleado_id]) porEmpleado[v.empleado_id] = { total: 0, numVentas: 0 }
    porEmpleado[v.empleado_id].total += v.total
    porEmpleado[v.empleado_id].numVentas += 1
  })
  const destacado = Object.entries(porEmpleado)
    .map(([empleado_id, stats]) => {
      const e = empleados.find((em) => em.id === Number(empleado_id))
      const sede = sedes.find((s) => s.id === e?.sede_id)
      return {
        nombre: e ? e.nombre : `Empleado ${empleado_id}`,
        sede: sede ? sede.nombre : null,
        ...stats,
      }
    })
    .sort((a, b) => b.total - a.total)[0]

  // Tendencia de ventas por día (1, 7 o 15 días según el periodo)
  const numDias = periodo === 'dia' ? 1 : periodo === 'semana' ? 7 : 15
  const ventasPorDia = []
  for (let i = numDias - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const clave = d.toDateString()
    const diaTotal = filtradas
      .filter((v) => new Date(v.fecha).toDateString() === clave)
      .reduce((sum, v) => sum + v.total, 0)
    ventasPorDia.push({
      fecha: d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      total: diaTotal,
    })
  }

  return {
    periodo,
    total,
    numVentas,
    ticketPromedio,
    totalPorSede,
    productosMasVendidos,
    empleadoDestacado: destacado || null,
    ventasPorDia,
  }
}

// Vista informativa de ventas por vendedor (NO calcula comisiones: solo muestra
// cuánto vendió cada empleado en el periodo, con el detalle de sus ventas).
async function getComisiones({ periodo = 'mes', sede_id } = {}) {
  await delay()

  const inicio = inicioPeriodo(periodo)
  const filtradas = ventas.filter((v) => new Date(v.fecha) >= inicio)

  const porEmpleado = {}
  filtradas.forEach((v) => {
    if (!porEmpleado[v.empleado_id]) {
      porEmpleado[v.empleado_id] = { total: 0, numVentas: 0, ventas: [] }
    }
    porEmpleado[v.empleado_id].total += v.total
    porEmpleado[v.empleado_id].numVentas += 1
    const factura = facturas.find((f) => f.venta_id === v.id)
    porEmpleado[v.empleado_id].ventas.push({
      venta_id: v.id,
      fecha: v.fecha,
      sede_venta_id: v.sede_venta_id,
      tipo: v.tipo,
      total: v.total,
      factura: factura ? factura.numero_interno : null,
    })
  })

  const lista = Object.entries(porEmpleado).map(([empleado_id, stats]) => {
    const e = empleados.find((em) => em.id === Number(empleado_id))
    const sede = sedes.find((s) => s.id === e?.sede_id)
    return {
      empleado_id: Number(empleado_id),
      nombre: e ? e.nombre : `Empleado ${empleado_id}`,
      sede_id: e ? e.sede_id : null,
      sede: sede ? sede.nombre : null,
      ...stats,
    }
  })

  // Filtro opcional por la sede del VENDEDOR (no por la sede de la venta)
  const filtrada = sede_id ? lista.filter((l) => l.sede_id === Number(sede_id)) : lista
  return filtrada.sort((a, b) => b.total - a.total)
}

// Historial de ventas filtrable (sede de venta, vendedor, tipo, periodo).
// Devuelve paginación con la MISMA forma que Laravel (data + meta), para
// facilitar la conexión al backend real.
async function getVentas(params = {}) {
  await delay()

  const {
    periodo = 'mes',
    sede_id,
    empleado_id,
    tipo,
    page = 1,
    per_page = 10,
  } = params

  const inicio = inicioPeriodo(periodo)
  let filtradas = ventas.filter((v) => new Date(v.fecha) >= inicio)
  if (sede_id) filtradas = filtradas.filter((v) => v.sede_venta_id === Number(sede_id))
  if (empleado_id) filtradas = filtradas.filter((v) => v.empleado_id === Number(empleado_id))
  if (tipo) filtradas = filtradas.filter((v) => v.tipo === tipo)

  const total = filtradas.length
  const last_page = Math.max(1, Math.ceil(total / per_page))
  const current_page = Math.min(Math.max(1, Number(page)), last_page)
  const start = (current_page - 1) * per_page
  const totalVendido = filtradas.reduce((sum, v) => sum + v.total, 0)

  const data = filtradas.slice(start, start + per_page).map((v) => {
    const e = empleados.find((em) => em.id === v.empleado_id)
    const sede = sedes.find((s) => s.id === v.sede_venta_id)
    const factura = facturas.find((f) => f.venta_id === v.id)
    return {
      id: v.id,
      factura: factura ? factura.numero_interno : null,
      fecha: v.fecha,
      empleado: { id: v.empleado_id, nombre: e ? e.nombre : '—' },
      sede_venta: sede ? sede.nombre : '—',
      tipo: v.tipo,
      total: v.total,
    }
  })

  return {
    data,
    meta: { total, per_page, current_page, last_page },
    resumen: { totalVendido },
  }
}

async function getCategorias() {
  await delay()
  return categorias
}

async function getSubcategorias() {
  await delay()
  return subcategorias
}

// Listado de productos con filtros opcionales por categoría/subcategoría.
// Incluye el stock total sumando las 4 sedes (información útil para el CRUD).
async function getProductos({ categoria_id, subcategoria_id } = {}) {
  await delay()
  let lista = productos
  if (categoria_id) lista = lista.filter((p) => p.categoria_id === Number(categoria_id))
  if (subcategoria_id) lista = lista.filter((p) => p.subcategoria_id === Number(subcategoria_id))
  return lista.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: p.precio,
    sku: p.sku,
    codigo_barras: p.codigo_barras,
    categoria_id: p.categoria_id,
    categoria: categorias.find((c) => c.id === p.categoria_id)?.nombre || null,
    subcategoria_id: p.subcategoria_id,
    subcategoria: subcategorias.find((s) => s.id === p.subcategoria_id)?.nombre || null,
    imagen_url: p.imagen_url,
    stock_total: inventario
      .filter((i) => i.producto_id === p.id)
      .reduce((sum, i) => sum + i.cantidad, 0),
  }))
}

// Crea un producto (SKU y código de barras únicos) e inicializa su stock en 0 en las 4 sedes.
async function createProducto(body) {
  await delay()
  const { nombre, descripcion, precio, sku, codigo_barras, categoria_id, subcategoria_id, imagen_url } = body
  if (!nombre || !precio) throw new Error('Nombre y precio son obligatorios')
  if (sku && productos.some((p) => p.sku === sku)) throw new Error('El SKU ya existe')
  if (codigo_barras && productos.some((p) => p.codigo_barras === codigo_barras)) {
    throw new Error('El código de barras ya existe')
  }

  const nuevo = {
    id: Math.max(...productos.map((p) => p.id), 0) + 1,
    nombre,
    descripcion: descripcion || '',
    precio: Number(precio),
    sku: sku || null,
    codigo_barras: codigo_barras || null,
    categoria_id: Number(categoria_id) || null,
    subcategoria_id: Number(subcategoria_id) || null,
    imagen_url: imagen_url || '/images/products/camiseta.svg',
  }
  productos.push(nuevo)
  sedes.forEach((s) => inventario.push({ producto_id: nuevo.id, sede_id: s.id, cantidad: 0 }))
  return nuevo
}

async function updateProducto(id, body) {
  await delay()
  const p = productos.find((pr) => pr.id === Number(id))
  if (!p) throw new Error('Producto no encontrado')
  const { nombre, descripcion, precio, sku, codigo_barras, categoria_id, subcategoria_id, imagen_url } = body
  if (sku && productos.some((pr) => pr.sku === sku && pr.id !== p.id)) {
    throw new Error('El SKU ya existe en otro producto')
  }
  if (codigo_barras && productos.some((pr) => pr.codigo_barras === codigo_barras && pr.id !== p.id)) {
    throw new Error('El código de barras ya existe en otro producto')
  }
  Object.assign(p, {
    nombre: nombre ?? p.nombre,
    descripcion: descripcion ?? p.descripcion,
    precio: precio !== undefined ? Number(precio) : p.precio,
    sku: sku ?? p.sku,
    codigo_barras: codigo_barras ?? p.codigo_barras,
    categoria_id: categoria_id !== undefined ? Number(categoria_id) : p.categoria_id,
    subcategoria_id: subcategoria_id !== undefined ? Number(subcategoria_id) : p.subcategoria_id,
    imagen_url: imagen_url ?? p.imagen_url,
  })
  return p
}

async function deleteProducto(id) {
  await delay()
  const idx = productos.findIndex((pr) => pr.id === Number(id))
  if (idx === -1) throw new Error('Producto no encontrado')
  productos.splice(idx, 1)
  // Retira también su stock de las 4 sedes
  for (let i = inventario.length - 1; i >= 0; i -= 1) {
    if (inventario[i].producto_id === Number(id)) inventario.splice(i, 1)
  }
  return { ok: true, id: Number(id) }
}

// Matriz completa de stock: cada producto con su cantidad por las 4 sedes.
// Incluye los productos con 0 unidades (a diferencia de getInventario del POS).
async function getInventarioCompleto() {
  await delay()
  return productos.map((p) => {
    const stock = sedes.map((s) => {
      const reg = inventario.find((i) => i.producto_id === p.id && i.sede_id === s.id)
      return { sede_id: s.id, sede: s.nombre, cantidad: reg ? reg.cantidad : 0 }
    })
    return {
      producto_id: p.id,
      nombre: p.nombre,
      sku: p.sku,
      codigo_barras: p.codigo_barras,
      categoria_id: p.categoria_id,
      subcategoria_id: p.subcategoria_id,
      imagen_url: p.imagen_url,
      stock,
    }
  })
}

// Ajuste manual de stock por sede: entrada (suma) o salida (resta).
// La salida se valida para no dejar el stock en negativo.
async function ajustarInventario({ producto_id, sede_id, tipo, cantidad, motivo }) {
  await delay()

  const qty = Number(cantidad)
  if (!qty || qty <= 0) throw new Error('La cantidad debe ser mayor a cero')

  const reg = inventario.find(
    (i) => i.producto_id === Number(producto_id) && i.sede_id === Number(sede_id),
  )
  if (!reg) throw new Error('Registro de inventario no encontrado')

  if (tipo === 'salida') {
    if (reg.cantidad - qty < 0) throw new Error('La salida supera el stock disponible')
    reg.cantidad -= qty
  } else {
    reg.cantidad += qty
  }

  return {
    producto_id: reg.producto_id,
    sede_id: reg.sede_id,
    cantidad: reg.cantidad,
    tipo,
    cantidad_ajustada: qty,
    motivo: motivo || null,
  }
}

export default {
  login,
  getSedes,
  getEmpleados,
  getInventario,
  createVenta,
  getDashboard,
  getComisiones,
  getVentas,
  getCategorias,
  getSubcategorias,
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  getInventarioCompleto,
  ajustarInventario,
}