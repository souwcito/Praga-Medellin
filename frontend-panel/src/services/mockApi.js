// Simulador del backend: devuelve promesas con la misma forma que responderá la API real.
// Se usa solo cuando VITE_USE_MOCK=true (ver services/api.js).
//
// El inventario y las ventas ahora se manejan por VARIANTE (producto + talla),
// cada una con su propio código de barras único.

import {
  categorias,
  detalleVentas,
  devoluciones,
  detalleDevoluciones,
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
    const precio = Number(p.precio)
    const precioAntes = p.precio_antes ? Number(p.precio_antes) : null
    const esOferta = precioAntes !== null && precioAntes > precio
    return {
      id: p.id,
      nombre: p.nombre,
      nombre_interno: p.nombre_interno || null,
      descripcion: p.descripcion,
      precio,
      precio_antes: precioAntes,
      es_oferta: esOferta,
      descuento: esOferta ? Math.round(((precioAntes - precio) / precioAntes) * 100) : null,
      sku: p.sku,
      categoria_id: p.categoria_id,
      categoria: categorias.find((c) => c.id === p.categoria_id)?.nombre || null,
      subcategoria_id: p.subcategoria_id,
      subcategoria: subcategorias.find((s) => s.id === p.subcategoria_id)?.nombre || null,
      imagen_url: p.imagen_url,
      imagenes: p.imagenes && p.imagenes.length ? p.imagenes : p.imagen_url ? [p.imagen_url] : [],
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
    nombre_interno,
    descripcion,
    precio,
    precio_antes,
    sku,
    categoria_id,
    subcategoria_id,
    imagen_url,
    imagenes = [],
    variantes: variantesForm = [],
  } = body

  if (!nombre || !precio) throw new Error('Nombre y precio son obligatorios')
  if (sku && productos.some((p) => p.sku === sku)) throw new Error('El SKU ya existe')

  const listaImagenes =
    Array.isArray(imagenes) && imagenes.length ? imagenes : imagen_url ? [imagen_url] : []

  const nuevo = {
    id: Math.max(...productos.map((p) => p.id), 0) + 1,
    nombre,
    nombre_interno: nombre_interno || null,
    descripcion: descripcion || '',
    precio: Number(precio),
    precio_antes: precio_antes ? Number(precio_antes) : null,
    sku: sku || null,
    categoria_id: Number(categoria_id) || null,
    subcategoria_id: Number(subcategoria_id) || null,
    imagen_url: listaImagenes[0] || '/images/products/camiseta.svg',
    imagenes: listaImagenes.length ? listaImagenes : null,
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
    const aplicar = Array.isArray(body.sedes) && body.sedes.length ? body.sedes.map(Number) : null
    sedes.forEach((s) =>
      inventario.push({
        variante_id: variante.id,
        sede_id: s.id,
        cantidad: aplicar === null || aplicar.includes(s.id) ? inicial : 0,
      }),
    )
  })
  return nuevo
}

async function updateProducto(id, body) {
  await delay()
  const p = productos.find((pr) => pr.id === Number(id))
  if (!p) throw new Error('Producto no encontrado')

  const {
    nombre,
    nombre_interno,
    descripcion,
    precio,
    precio_antes,
    sku,
    categoria_id,
    subcategoria_id,
    imagen_url,
    imagenes,
    variantes: variantesForm = [],
  } = body

  if (sku && productos.some((pr) => pr.sku === sku && pr.id !== p.id)) {
    throw new Error('El SKU ya existe en otro producto')
  }

  if (imagenes !== undefined) {
    const lista =
      Array.isArray(imagenes) && imagenes.length ? imagenes : imagen_url ? [imagen_url] : []
    p.imagenes = lista.length ? lista : null
    p.imagen_url = lista[0] ?? p.imagen_url
  }

  const comboCambio =
    (categoria_id !== undefined && Number(categoria_id) !== p.categoria_id) ||
    (subcategoria_id !== undefined && Number(subcategoria_id) !== p.subcategoria_id)

  Object.assign(p, {
    nombre: nombre ?? p.nombre,
    nombre_interno: nombre_interno !== undefined ? nombre_interno : p.nombre_interno,
    descripcion: descripcion ?? p.descripcion,
    precio: precio !== undefined ? Number(precio) : p.precio,
    precio_antes: precio_antes !== undefined ? (precio_antes ? Number(precio_antes) : null) : p.precio_antes,
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
    // Misma combinación: se actualizan los códigos de barras, se aplica el stock
    // inicial por talla (a las 4 sedes), se agregan tallas nuevas y se quitan las
    // que ya no vienen en el formulario.
    const lista = variantes.filter((v) => v.producto_id === p.id)
    const claveTalla = (t) => (t === null || t === '' ? '__unica__' : String(t))
    variantesForm.forEach((f) => {
      const clave = claveTalla(f.talla)
      const barra = f.codigo_barras
      const tieneStock = f.stock_inicial !== '' && f.stock_inicial != null
      let v = lista.find((x) => claveTalla(x.talla) === clave)
      const aplicar = Array.isArray(body.sedes) && body.sedes.length ? body.sedes.map(Number) : null
      if (!v) {
        v = {
          id: nextVarianteId(),
          producto_id: p.id,
          talla: f.talla === '' ? null : f.talla,
          codigo_barras: barra || siguienteBarra(),
        }
        variantes.push(v)
        const inicial = tieneStock ? Number(f.stock_inicial) : 0
        sedes.forEach((s) =>
          inventario.push({
            variante_id: v.id,
            sede_id: s.id,
            cantidad: aplicar === null || aplicar.includes(s.id) ? inicial : 0,
          }),
        )
      } else {
        if (barra) v.codigo_barras = barra
        if (tieneStock) {
          inventario.forEach((i) => {
            if (
              i.variante_id === v.id &&
              (aplicar === null || aplicar.includes(i.sede_id))
            ) {
              i.cantidad = Number(f.stock_inicial)
            }
          })
        }
      }
    })
    const presentes = new Set(variantesForm.map((f) => claveTalla(f.talla)))
    lista.forEach((v) => {
      if (!presentes.has(claveTalla(v.talla))) {
        for (let j = inventario.length - 1; j >= 0; j -= 1) {
          if (inventario[j].variante_id === v.id) inventario.splice(j, 1)
        }
        variantes.splice(variantes.indexOf(v), 1)
      }
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

  const { empleado_id, sede_venta_id, tipo, items, pagos } = body
  if (!empleado_id || !sede_venta_id || !Array.isArray(items) || items.length === 0) {
    throw new Error('Faltan datos para registrar la venta')
  }
  if (!Array.isArray(pagos) || pagos.length === 0) {
    throw new Error('Debe registrar al menos una forma de pago')
  }

  const detalle = items.map((item) => {
    const reg = inventario.find(
      (i) => i.sede_id === Number(sede_venta_id) && i.variante_id === item.variante_id,
    )
    if (!reg || reg.cantidad < item.cantidad) {
      throw new Error('Stock insuficiente en la sede para la variante solicitada')
    }
    reg.cantidad -= item.cantidad
    const precioUnitario = Number(item.precio_unitario)
    const precioFinal = item.precio_final ? Number(item.precio_final) : precioUnitario
    if (precioFinal > precioUnitario) throw new Error('El precio final no puede ser mayor al unitario')
    return {
      variante_id: item.variante_id,
      sede_stock_id: Number(sede_venta_id),
      cantidad: item.cantidad,
      precio_unitario: precioUnitario,
      precio_final: precioFinal,
      descuento: (precioUnitario - precioFinal) * item.cantidad,
      subtotal: precioFinal * item.cantidad,
    }
  })

  const total = detalle.reduce((sum, d) => sum + d.subtotal, 0)
  const sumaPagos = pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0)
  if (sumaPagos !== total) throw new Error('El total de los pagos no coincide con el total de la venta')

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
  const pagosVenta = pagos.map((p) => ({ venta_id: venta.id, metodo_pago: p.metodo_pago, monto: Number(p.monto) || 0 }))
  venta.pagos = pagosVenta

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
        precio_final: d.precio_final,
        descuento: d.descuento,
        subtotal: d.subtotal,
      }
    }),
    pagos: pagosVenta.map((p) => ({ metodo_pago: p.metodo_pago, monto: p.monto })),
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
    const detallesVenta = detalleVentas.filter((d) => d.venta_id === v.id)
    const descuentoTotal = detallesVenta.reduce((s, d) => s + (d.descuento || 0), 0)
    return {
      id: v.id,
      factura: factura ? factura.numero_interno : null,
      fecha: v.fecha,
      empleado: { id: v.empleado_id, nombre: e ? e.nombre : '—' },
      sede_venta: sede ? sede.nombre : '—',
      tipo: v.tipo,
      total: v.total,
      descuento_total: descuentoTotal,
      pagos: (v.pagos || []).map((p) => ({ metodo_pago: p.metodo_pago, monto: p.monto })),
    }
  })

  return {
    data,
    meta: { total, per_page, current_page, last_page },
    resumen: { totalVendido },
  }
}

// Clientes y pedidos online (en el mock están vacíos; llegan con el checkout web)
async function getClientes() {
  await delay()
  return []
}

async function getPedidos() {
  await delay()
  return { data: [] }
}

// Busca una venta por su número de factura para precargar una devolución.
async function buscarVentaPorFactura({ factura } = {}) {
  await delay(200)
  const f = facturas.find(
    (x) => String(x.numero_interno).toLowerCase() === String(factura).trim().toLowerCase(),
  )
  if (!f) throw new Error('No se encontró ninguna venta con esa factura')

  const venta = ventas.find((v) => v.id === f.venta_id)
  const empleado = empleados.find((e) => e.id === venta.empleado_id)
  const sede = sedes.find((s) => s.id === venta.sede_venta_id)

  const items = detalleVentas
    .filter((d) => d.venta_id === venta.id)
    .map((d) => {
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
    })

  return {
    venta: {
      id: venta.id,
      factura: f.numero_interno,
      fecha: venta.fecha,
      sede_venta: sede ? sede.nombre : '—',
      empleado: empleado ? empleado.nombre : '—',
      total: venta.total,
    },
    items,
  }
}

// Registra un CAMBIO o REEMBOLSO interno: los artículos devueltos vuelven al
// inventario; los de cambio salen del mismo en la sede indicada. El reembolso
// (caso extremo) entrega dinero al cliente y descuenta de ingresos.
let _devolucionSeq = 1001
async function crearDevolucion(body) {
  await delay()

  const {
    venta_id,
    sede_id,
    empleado_id,
    tipo = 'cambio',
    devueltos,
    cambios = [],
    metodo_pago,
    motivo,
  } = body
  if (!venta_id || !sede_id || !empleado_id) throw new Error('Faltan datos para registrar la devolución')
  if (!Array.isArray(devueltos) || devueltos.length === 0) throw new Error('Debes devolver al menos un artículo')

  const venta = ventas.find((v) => v.id === Number(venta_id))
  if (!venta) throw new Error('La venta de origen no existe')

  let totalDevuelto = 0
  devueltos.forEach((item) => {
    const vendido = detalleVentas
      .filter((d) => d.venta_id === Number(venta_id) && d.variante_id === Number(item.variante_id))
      .reduce((s, d) => s + d.cantidad, 0)
    if (Number(item.cantidad) > vendido) {
      throw new Error('La cantidad devuelta supera lo vendido en la factura')
    }
    totalDevuelto += Number(item.cantidad) * Number(item.precio_unitario)
  })

  let totalCambio = 0
  cambios.forEach((item) => {
    const reg = inventario.find(
      (i) => i.sede_id === Number(sede_id) && i.variante_id === Number(item.variante_id),
    )
    if (!reg || reg.cantidad < Number(item.cantidad)) {
      throw new Error('Stock insuficiente para el producto de cambio')
    }
    totalCambio += Number(item.cantidad) * Number(item.precio_unitario)
  })

  const diferencia = totalCambio - totalDevuelto
  if (tipo === 'reembolso') {
    if (cambios.length > 0) throw new Error('Un reembolso no puede incluir productos de cambio')
    if (!metodo_pago) throw new Error('Indica el método por el que se entrega el dinero al cliente')
  } else {
    if (cambios.length === 0) throw new Error('Debes agregar al menos un producto de cambio')
    if (diferencia < 0) throw new Error('El cambio debe ser de igual o mayor valor que lo devuelto')
    if (diferencia > 0 && !metodo_pago) throw new Error('El método de pago es obligatorio cuando hay diferencia')
  }

  const numeroInterno = `DEV-${_devolucionSeq++}`
  const fecha = new Date().toISOString()
  const devolucion = {
    id: devoluciones.length + 1,
    venta_id: Number(venta_id),
    sede_id: Number(sede_id),
    empleado_id: Number(empleado_id),
    numero_interno: numeroInterno,
    tipo,
    fecha,
    total_devuelto: totalDevuelto,
    total_cambio: totalCambio,
    diferencia,
    metodo_pago: tipo === 'reembolso' ? metodo_pago : diferencia > 0 ? metodo_pago : null,
    motivo: motivo || null,
    estado: 'completada',
  }
  devoluciones.push(devolucion)

  const detalle = []
  devueltos.forEach((item) => {
    const reg = inventario.find(
      (i) => i.sede_id === Number(sede_id) && i.variante_id === Number(item.variante_id),
    )
    if (reg) reg.cantidad += Number(item.cantidad)
    else inventario.push({ variante_id: Number(item.variante_id), sede_id: Number(sede_id), cantidad: Number(item.cantidad) })
    detalle.push({
      devolucion_id: devolucion.id,
      variante_id: Number(item.variante_id),
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      tipo: 'devuelto',
    })
  })
  cambios.forEach((item) => {
    const reg = inventario.find(
      (i) => i.sede_id === Number(sede_id) && i.variante_id === Number(item.variante_id),
    )
    reg.cantidad -= Number(item.cantidad)
    detalle.push({
      devolucion_id: devolucion.id,
      variante_id: Number(item.variante_id),
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      tipo: 'cambio',
    })
  })
  detalleDevoluciones.push(...detalle)

  return formatearDevolucion(devolucion, detalle)
}

function formatearDevolucion(d, detalle = []) {
  const factura = facturas.find((f) => f.venta_id === d.venta_id)
  const e = empleados.find((em) => em.id === d.empleado_id)
  const sede = sedes.find((s) => s.id === d.sede_id)

  const items = detalle.length
    ? detalle.map((dd) => {
        const v = variantes.find((x) => x.id === dd.variante_id)
        const p = productos.find((pr) => pr.id === v.producto_id)
        return {
          id: `${dd.devolucion_id}-${dd.tipo}-${dd.variante_id}`,
          variante_id: dd.variante_id,
          nombre: p ? p.nombre : `Producto ${dd.variante_id}`,
          talla: v ? v.talla : null,
          cantidad: dd.cantidad,
          precio_unitario: dd.precio_unitario,
          subtotal: dd.cantidad * dd.precio_unitario,
          tipo: dd.tipo,
        }
      })
    : null

  const base = {
    id: d.id,
    numero_interno: d.numero_interno,
    tipo: d.tipo || 'cambio',
    factura: factura ? factura.numero_interno : null,
    venta_id: d.venta_id,
    fecha: d.fecha,
    empleado: { id: d.empleado_id, nombre: e ? e.nombre : '—' },
    sede: sede ? sede.nombre : '—',
    total_devuelto: d.total_devuelto,
    total_cambio: d.total_cambio,
    diferencia: d.diferencia,
    reembolsado: (d.tipo || 'cambio') === 'reembolso' ? d.total_devuelto : null,
    metodo_pago: d.metodo_pago,
    motivo: d.motivo,
    estado: d.estado,
  }
  return items ? { ...base, items } : base
}

// Historial de devoluciones con paginación estilo Laravel.
async function getDevoluciones(params = {}) {
  await delay()

  const { periodo = 'mes', sede_id, empleado_id, tipo, page = 1, per_page = 10 } = params

  const inicio = inicioPeriodo(periodo)
  let filtradas = devoluciones.filter((d) => new Date(d.fecha) >= inicio)
  if (sede_id) filtradas = filtradas.filter((d) => d.sede_id === Number(sede_id))
  if (empleado_id) filtradas = filtradas.filter((d) => d.empleado_id === Number(empleado_id))
  if (tipo) filtradas = filtradas.filter((d) => d.tipo === tipo)

  const total = filtradas.length
  const last_page = Math.max(1, Math.ceil(total / per_page))
  const current_page = Math.min(Math.max(1, Number(page)), last_page)
  const start = (current_page - 1) * per_page

  const data = filtradas
    .slice(start, start + per_page)
    .map((d) => formatearDevolucion(d))

  return {
    data,
    meta: { total, per_page, current_page, last_page },
    resumen: {
      totalDevuelto: filtradas.reduce((s, d) => s + d.total_devuelto, 0),
      totalCambio: filtradas.reduce((s, d) => s + d.total_cambio, 0),
      totalReembolsado: filtradas
        .filter((d) => d.tipo === 'reembolso')
        .reduce((s, d) => s + d.total_devuelto, 0),
      numDevoluciones: total,
    },
  }
}

// Detalle de una devolución con sus artículos (devueltos + cambio).
async function getDevolucionDetalle(id) {
  await delay(150)
  const d = devoluciones.find((x) => x.id === Number(id))
  if (!d) throw new Error('Devolución no encontrada')
  const detalle = detalleDevoluciones.filter((dd) => dd.devolucion_id === d.id)
  return formatearDevolucion(d, detalle)
}

// Panel del DUEÑO: valoración de mercancía por sede + lista de productos.
async function getDuenoResumen() {
  await delay()
  const stockPorVarianteSede = (varianteId, sedeId) =>
    (inventario.find((i) => i.variante_id === varianteId && i.sede_id === sedeId) || {}).cantidad || 0

  const productosData = productos.map((p) => {
    const vars = variantes.filter((v) => v.producto_id === p.id)
    const stockPorSede = sedes.map((s) => ({
      sede_id: s.id,
      sede: s.nombre,
      cantidad: vars.reduce((sum, v) => sum + stockPorVarianteSede(v.id, s.id), 0),
    }))
    const unidades = stockPorSede.reduce((sum, s) => sum + s.cantidad, 0)
    const valorCosto = p.costo != null ? unidades * Number(p.costo) : 0
    const valorVenta = unidades * Number(p.precio)
    return {
      producto_id: p.id,
      nombre: p.nombre,
      nombre_interno: p.nombre_interno,
      categoria: categorias.find((c) => c.id === p.categoria_id)?.nombre || null,
      subcategoria: subcategorias.find((s) => s.id === p.subcategoria_id)?.nombre || null,
      catalogo: categorias.find((c) => c.id === p.categoria_id)?.catalogo || null,
      precio: Number(p.precio),
      costo: p.costo != null ? Number(p.costo) : null,
      unidades,
      valor_costo: valorCosto,
      valor_venta: valorVenta,
      margen: valorVenta - valorCosto,
      stock_por_sede: stockPorSede,
    }
  })

  const sedesData = sedes.map((s) => {
    const stock = productosData.map((pd) => pd.stock_por_sede.find((x) => x.sede_id === s.id)?.cantidad || 0)
    const unidades = stock.reduce((a, b) => a + b, 0)
    const valorVenta = productosData.reduce(
      (sum, pd) => sum + (pd.stock_por_sede.find((x) => x.sede_id === s.id)?.cantidad || 0) * pd.precio,
      0,
    )
    const valorCosto = productosData.reduce(
      (sum, pd) =>
        sum +
        (pd.costo != null ? (pd.stock_por_sede.find((x) => x.sede_id === s.id)?.cantidad || 0) * pd.costo : 0),
      0,
    )
    const unidadesSinCosto = productosData.reduce(
      (sum, pd) =>
        sum + (pd.costo == null ? pd.stock_por_sede.find((x) => x.sede_id === s.id)?.cantidad || 0 : 0),
      0,
    )
    return {
      sede_id: s.id,
      sede: s.nombre,
      unidades,
      valor_costo: valorCosto,
      valor_venta: valorVenta,
      margen: valorVenta - valorCosto,
      unidades_sin_costo: unidadesSinCosto,
    }
  })

  return {
    sedes: sedesData,
    total: {
      unidades: productosData.reduce((s, p) => s + p.unidades, 0),
      valor_costo: productosData.reduce((s, p) => s + p.valor_costo, 0),
      valor_venta: productosData.reduce((s, p) => s + p.valor_venta, 0),
      margen: productosData.reduce((s, p) => s + p.margen, 0),
      productos_sin_costo: productos.filter((p) => p.costo == null).length,
    },
    productos: productosData,
  }
}

// Edita el costo de un producto (panel del dueño).
async function updateCosto(id, body) {
  await delay(150)
  const p = productos.find((pr) => pr.id === Number(id))
  if (!p) throw new Error('Producto no encontrado')
  p.costo = body.costo != null && body.costo !== '' ? Number(body.costo) : null
  return { ok: true, id: Number(id), costo: p.costo }
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
  getClientes,
  getPedidos,
  buscarVentaPorFactura,
  crearDevolucion,
  getDevoluciones,
  getDevolucionDetalle,
  getDuenoResumen,
  updateCosto,
}
