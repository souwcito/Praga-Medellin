// Simulador del backend: devuelve promesas con la misma forma que responderá la API real.
// Se usa solo cuando VITE_USE_MOCK=true (ver services/api.js).

import { empleados, inventario, productos, sedes } from './mockData'

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

// Cuenta única del panel. Los vendedores son datos para facturar, no cuentas de acceso.
const ADMIN = { email: 'admin@praga.co', password: 'admin123', nombre: 'Administrador' }

// Estado en memoria para simular el registro de ventas, detalle y facturas internas.
const ventas = []
const detalleVentas = []
const facturas = []
let facturaCounter = 1000

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

export default {
  login,
  getSedes,
  getEmpleados,
  getInventario,
  createVenta,
}