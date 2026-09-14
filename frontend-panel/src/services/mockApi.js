// Simulador del backend: devuelve promesas con la misma forma que responderá la API real.
// Se usa solo cuando VITE_USE_MOCK=true (ver services/api.js).
//
// El inventario y las ventas ahora se manejan por VARIANTE (producto + talla),
// cada una con su propio código de barras único.

import {
  categorias,
  detalleVentas,
  empleados,
  facturas,
  inventario,
  productos,
  sedes,
  subcategorias,
  tallasPara,
  variantes,
  ventas,
} from './mockData'

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

const ADMIN = { email: 'admin@praga.co', password: 'admin123', nombre: 'Administrador' }

let facturaCounter = 1000 + facturas.length
let _barraSeq = variantes.reduce((m, v) => Math.max(m, Number(v.codigo_barras) || 0), 0)

function siguienteBarra() {
  _barraSeq += 1
  return String(_barraSeq)
}

function nextVarianteId() {
  return Math.max(...variantes.map((v) => v.id), 0) + 1
}

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

// Subida de imagen simulada: convierte el archivo a data URL para mostrarla
// de inmediato (en el backend real se sube a storage y se devuelve la URL).
async function subirImagen(file) {
  await delay(150)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ imagen_url: reader.result })
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

async function getSedes() {
  await delay()
  return sedes
}

async function getEmpleados() {
  await delay()
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

async function getCategorias() {
  await delay()
  return categorias
}

async function getSubcategorias() {
  await delay()
  return subcategorias
}

// Stock disponible (>0) de una sede, a nivel de VARIANTE: el POS vende la
// unidad exacta (producto + talla) que está físicamente en esa sede.
async function getInventario({ sede_id }) {
  await delay()
  return inventario
    .filter((i) => i.sede_id === Number(sede_id) && i.cantidad > 0)
    .map((i) => {
      const v = variantes.find((x) => x.id === i.variante_id)
      const p = productos.find((pr) => pr.id === v.producto_id)
      return {
        variante_id: v.id,
        producto_id: p.id,
        nombre: p.nombre,
        talla: v.talla,
        precio: p.precio,
        sku: p.sku,
        codigo_barras: v.codigo_barras,
        imagen_url: p.imagen_url,
        stock: i.cantidad,
      }
    })
}

// Listado de productos base con sus VARIANTES embebidas (para el CRUD).
async function getProductos({ categoria_id, subcategoria_id } = {}) {
  await delay()
  let lista = productos
  if (categoria_id) lista = lista.filter((p) => p.categoria_id === Number(categoria_id))
  if (subcategoria_id) lista = lista.filter((p) => p.subcategoria_id === Number(subcategoria_id))

  return lista.map((p) => {
    const vars = variantes.filter((v) => v.producto_id === p.id)
    const stockTotal = (varianteId) =>
      inventario.filter((i) => i.variante_id === varianteId).reduce((s, i) => s + i.cantidad, 0)
    return {
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      sku: p.sku,
      categoria_id: p.categoria_id,
      categoria: categorias.find((c) => c.id === p.categoria_id)?.nombre || null,
      subcategoria_id: p.subcategoria_id,
      subcategoria: subcategorias.find((s) => s.id === p.subcategoria_id)?.nombre || null,
      imagen_url: p.imagen_url,
      variantes: vars.map((v) => ({
        id: v.id,
        talla: v.talla,
        codigo_barras: v.codigo_barras,
        stock_total: stockTotal(v.id),
      })),
      stock_total: vars.reduce((sum, v) => sum + stockTotal(v.id), 0),
    }
  })
}

// Elimina las variantes (y su inventario) de un producto.
function eliminarVariantesDe(productoId) {
  const ids = variantes.filter((v) => v.producto_id === productoId).map((v) => v.id)
  for (let i = variantes.length - 1; i >= 0; i -= 1) {
    if (variantes[i].producto_id === productoId) variantes.splice(i, 1)
  }
  for (let i = inventario.length - 1; i >= 0; i -= 1) {
    if (ids.includes(inventario[i].variante_id)) inventario.splice(i, 1)
  }
}

// Crea el producto y sus variantes automáticamente según las tallas de la
// combinación categoría+subcategoría. Cada variante recibe código de barras
// único y su stock inicia (0 o el valor inicial) en las 4 sedes.
async function createProducto(body) {
  await delay()
  const {
    nombre,
    descripcion,
    precio,
    sku,
    categoria_id,
    subcategoria_id,
    imagen_url,
    variantes: variantesForm = [],
  } = body

  if (!nombre || !precio) throw new Error('Nombre y precio son obligatorios')
  if (sku && productos.some((p) => p.sku === sku)) throw new Error('El SKU ya existe')

  const nuevo = {
    id: Math.max(...productos.map((p) => p.id), 0) + 1,
    nombre,
    descripcion: descripcion || '',
    precio: Number(precio),
    sku: sku || null,
    categoria_id: Number(categoria_id) || null,
    subcategoria_id: Number(subcategoria_id) || null,
    imagen_url: imagen_url || '/images/products/camiseta.svg',
  }
  productos.push(nuevo)

  const tallas = tallasPara(categoria_id, subcategoria_id)
  const listaTallas = tallas.length ? tallas : [null]
  listaTallas.forEach((t, idx) => {
    const f = variantesForm[idx] || {}
    const variante = {
      id: nextVarianteId(),
      producto_id: nuevo.id,
      talla: t,
      codigo_barras: f.codigo_barras || siguienteBarra(),
    }
    variantes.push(variante)
    const inicial = Number(f.stock_inicial) || 0
    sedes.forEach((s) => inventario.push({ variante_id: variante.id, sede_id: s.id, cantidad: inicial }))
  })
  return nuevo
}

async function updateProducto(id, body) {
  await delay()
  const p = productos.find((pr) => pr.id === Number(id))
  if (!p) throw new Error('Producto no encontrado')

  const {
    nombre,
    descripcion,
    precio,
    sku,
    categoria_id,
    subcategoria_id,
    imagen_url,
    variantes: variantesForm = [],
  } = body

  if (sku && productos.some((pr) => pr.sku === sku && pr.id !== p.id)) {
    throw new Error('El SKU ya existe en otro producto')
  }

  const comboCambio =
    (categoria_id !== undefined && Number(categoria_id) !== p.categoria_id) ||
    (subcategoria_id !== undefined && Number(subcategoria_id) !== p.subcategoria_id)

  Object.assign(p, {
    nombre: nombre ?? p.nombre,
    descripcion: descripcion ?? p.descripcion,
    precio: precio !== undefined ? Number(precio) : p.precio,
    sku: sku ?? p.sku,
    categoria_id: categoria_id !== undefined ? Number(categoria_id) : p.categoria_id,
    subcategoria_id: subcategoria_id !== undefined ? Number(subcategoria_id) : p.subcategoria_id,
    imagen_url: imagen_url ?? p.imagen_url,
  })

  if (comboCambio) {
    // Cambió la combinación: se regeneran las variantes según las nuevas tallas
    // (se reinicia el stock a 0 y se asignan códigos de barras nuevos).
    eliminarVariantesDe(p.id)
    const tallas = tallasPara(p.categoria_id, p.subcategoria_id)
    const lista = tallas.length ? tallas : [null]
    lista.forEach((t) => {
      const variante = {
        id: nextVarianteId(),
        producto_id: p.id,
        talla: t,
        codigo_barras: siguienteBarra(),
      }
      variantes.push(variante)
      sedes.forEach((s) => inventario.push({ variante_id: variante.id, sede_id: s.id, cantidad: 0 }))
    })
  } else if (variantesForm.length) {
    // Misma combinación: solo se actualizan los códigos de barras de las variantes
    const lista = variantes.filter((v) => v.producto_id === p.id)
    variantesForm.forEach((f, idx) => {
      if (f && f.codigo_barras && lista[idx]) lista[idx].codigo_barras = f.codigo_barras
    })
  }
  return p
}

async function deleteProducto(id) {
  await delay()
  const idx = productos.findIndex((pr) => pr.id === Number(id))
  if (idx === -1) throw new Error('Producto no encontrado')
  productos.splice(idx, 1)
  eliminarVariantesDe(Number(id))
  return { ok: true, id: Number(id) }
}

// Matriz completa de stock por VARIANTE y sede (incluye las de 0 unidades).
async function getInventarioCompleto() {
  await delay()
  return variantes.map((v) => {
    const p = productos.find((pr) => pr.id === v.producto_id)
    const stock = sedes.map((s) => {
      const reg = inventario.find((i) => i.variante_id === v.id && i.sede_id === s.id)
      return { sede_id: s.id, sede: s.nombre, cantidad: reg ? reg.cantidad : 0 }
    })
    return {
      variante_id: v.id,
      producto_id: p.id,
      nombre: p.nombre,
      talla: v.talla,
      sku: p.sku,
      codigo_barras: v.codigo_barras,
      categoria_id: p.categoria_id,
      subcategoria_id: p.subcategoria_id,
      imagen_url: p.imagen_url,
      stock,
    }
  })
}

// Ajuste manual de stock por VARIANTE y sede: entrada (suma) o salida (resta).
async function ajustarInventario({ variante_id, sede_id, tipo, cantidad, motivo }) {
  await delay()

  const qty = Number(cantidad)
  if (!qty || qty <= 0) throw new Error('La cantidad debe ser mayor a cero')

  const reg = inventario.find(
    (i) => i.variante_id === Number(variante_id) && i.sede_id === Number(sede_id),
  )
  if (!reg) throw new Error('Registro de inventario no encontrado')

  if (tipo === 'salida') {
    if (reg.cantidad - qty < 0) throw new Error('La salida supera el stock disponible')
    reg.cantidad -= qty
  } else {
    reg.cantidad += qty
  }

  return {
    variante_id: reg.variante_id,
    sede_id: reg.sede_id,
    cantidad: reg.cantidad,
    tipo,
    cantidad_ajustada: qty,
    motivo: motivo || null,
  }
}

// Registra la venta por VARIANTE: valida/descuenta el stock de la sede de venta.
async function createVenta(body) {
  await delay()

  const { empleado_id, sede_venta_id, tipo, items } = body
  if (!empleado_id || !sede_venta_id || !Array.isArray(items) || items.length === 0) {
    throw new Error('Faltan datos para registrar la venta')
  }

  const detalle = items.map((item) => {
    const reg = inventario.find(
      (i) => i.sede_id === Number(sede_venta_id) && i.variante_id === item.variante_id,
    )
    if (!reg || reg.cantidad < item.cantidad) {
      throw new Error('Stock insuficiente en la sede para la variante solicitada')
    }
    reg.cantidad -= item.cantidad
    return {
      variante_id: item.variante_id,
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
      const v = variantes.find((x) => x.id === d.variante_id)
      const p = productos.find((pr) => pr.id === v.producto_id)
      return {
        variante_id: d.variante_id,
        nombre: p ? p.nombre : `Producto ${d.variante_id}`,
        talla: v ? v.talla : null,
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

function inicioPeriodo(periodo) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const dias = periodo === 'dia' ? 0 : periodo === 'semana' ? 6 : 29
  d.setDate(d.getDate() - dias)
  return d
}

async function getDashboard({ periodo = 'mes' } = {}) {
  await delay()

  const inicio = inicioPeriodo(periodo)
  const filtradas = ventas.filter((v) => new Date(v.fecha) >= inicio)

  const total = filtradas.reduce((sum, v) => sum + v.total, 0)
  const numVentas = filtradas.length
  const ticketPromedio = numVentas ? Math.round(total / numVentas) : 0

  const totalPorSede = sedes.map((s) => ({
    sede_id: s.id,
    sede: s.nombre,
    total: filtradas
      .filter((v) => v.sede_venta_id === s.id)
      .reduce((sum, v) => sum + v.total, 0),
  }))

  // Productos más vendidos: agrega por producto a partir de la variante vendida
  const conteo = {}
  detalleVentas.forEach((d) => {
    if (!filtradas.some((v) => v.id === d.venta_id)) return
    const v = variantes.find((x) => x.id === d.variante_id)
    const productoId = v ? v.producto_id : d.variante_id
    conteo[productoId] = (conteo[productoId] || 0) + d.cantidad
  })
  const productosMasVendidos = Object.entries(conteo)
    .map(([producto_id, cantidad]) => {
      const p = productos.find((pr) => pr.id === Number(producto_id))
      return { producto: p ? p.nombre : `Producto ${producto_id}`, cantidad }
    })
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)

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

// Vista informativa de ventas por vendedor (sin cálculo de comisión).
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

  const filtrada = sede_id ? lista.filter((l) => l.sede_id === Number(sede_id)) : lista
  return filtrada.sort((a, b) => b.total - a.total)
}

// Historial de ventas con paginación estilo Laravel.
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

export default {
  login,
  subirImagen,
  getSedes,
  getEmpleados,
  getCategorias,
  getSubcategorias,
  getInventario,
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  getInventarioCompleto,
  ajustarInventario,
  createVenta,
  getDashboard,
  getComisiones,
  getVentas,
}