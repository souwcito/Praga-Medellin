// Simulador del backend: devuelve promesas con la misma forma que responderá la API real.
// Se usa solo cuando VITE_USE_MOCK=true (ver services/api.js).

import {
  detalleVentas,
  empleados,
  facturas,
  inventario,
  productos,
  sedes,
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

export default {
  login,
  getSedes,
  getEmpleados,
  getInventario,
  createVenta,
  getDashboard,
  getComisiones,
}