// Cliente centralizado hacia la API REST del backend (Laravel + Sanctum).
// - Con VITE_USE_MOCK=true responde con datos simulados (mockApi.js).
// - Con VITE_USE_MOCK=false hace fetch real a VITE_API_URL con token Bearer.
// Para conectar el backend real solo se cambia el .env y se agregan las rutas a mockRoutes.

import axios from 'axios'
import mockApi from './mockApi'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const CONFIGURED_API_URL = import.meta.env.VITE_API_URL || ''

// En producción usamos la API en el mismo origen (/api). El panel también puede
// abrirse como www.pragamedellin.com o desde un navegador interno (Instagram,
// Facebook, etc.); con una URL relativa no depende del dominio ni del CORS.
// En local (localhost/127.0.0.1) se usa la URL absoluta del .env.
function resolveApiUrl() {
  if (typeof window === 'undefined') return CONFIGURED_API_URL
  const host = window.location.hostname
  const esLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  return esLocal ? CONFIGURED_API_URL : '/api'
}

const API_URL = resolveApiUrl()

// Expuesto para que la UI (ej. hint de login) se adapte al modo
export { USE_MOCK }

const http = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// Inyecta el token Bearer en cada petición real
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('praga_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normaliza errores: conserva los campos que ya usa el panel ({ error }) y
// agrega un mensaje claro cuando la respuesta es HTML/vacía o no hay red.
function normalizarError(err) {
  const data = err?.response?.data
  const status = err?.response?.status ?? 0

  if (data && typeof data === 'object') {
    const mensaje = data.message || data.error
    if (mensaje) return { ...data, status, message: mensaje }
    const fallback = 'No se pudo completar la operación. Intenta de nuevo.'
    return { ...data, status, error: fallback, message: fallback }
  }

  if (status >= 500) {
    const mensaje = 'El servidor está presentando problemas. Intenta de nuevo en unos segundos.'
    return { status, error: mensaje, message: mensaje }
  }

  if (typeof data === 'string' && data.trim() !== '') {
    const mensaje = 'El servidor no respondió correctamente. Intenta de nuevo.'
    return { status, error: mensaje, message: mensaje }
  }

  if (err?.code === 'ECONNABORTED') {
    const mensaje = 'La conexión tardó demasiado. Revisa tu internet e intenta de nuevo.'
    return { status, error: mensaje, message: mensaje }
  }

  if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK') {
    const mensaje = 'No pudimos conectar con el servidor. Revisa tu conexión.'
    return { status, error: mensaje, message: mensaje }
  }

  const mensaje = err?.message || 'No se pudo conectar con el servidor. Intenta de nuevo.'
  return { status, error: mensaje, message: mensaje }
}

// Simplifica el manejo: siempre se recibe el cuerpo de la respuesta (res.data)
http.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(normalizarError(err)),
)

const ESPERA_REINTENTO_MS = 900

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Rutas disponibles en modo mock (crecen con cada funcionalidad).
// La llave sigue el formato "METODO /ruta" del endpoint real.
const mockRoutes = {
  'POST /login': (body) => mockApi.login(body),
  'GET /sedes': () => mockApi.getSedes(),
  'GET /empleados': () => mockApi.getEmpleados(),
  'GET /inventario': (params) => mockApi.getInventario(params),
  'POST /ventas': (body) => mockApi.createVenta(body),
  'POST /ventas/:id/revertir': (body, url) => mockApi.revertirVenta(url.split('/')[2]),
  'GET /dashboard': (params) => mockApi.getDashboard(params),
  'GET /comisiones': (params) => mockApi.getComisiones(params),
  'GET /ventas': (params) => mockApi.getVentas(params),
  'GET /categorias': () => mockApi.getCategorias(),
  'GET /subcategorias': () => mockApi.getSubcategorias(),
  'GET /productos': (params) => mockApi.getProductos(params),
  'GET /productos/:id/stock': (params, url) => mockApi.getProductoStock(url.split('/')[2]),
  'GET /stickers/categoria': (params) => mockApi.getStickersCategoria(params),
  'GET /configuracion/etiquetas': () => mockApi.getConfiguracionEtiquetas(),
  'PUT /configuracion/etiquetas': (body) => mockApi.updateConfiguracionEtiquetas(body),
  'POST /productos': (body) => mockApi.createProducto(body),
  'PUT /productos/:id': (body, url) => mockApi.updateProducto(url.split('/').pop(), body),
  'DELETE /productos/:id': (url) => mockApi.deleteProducto(url.split('/').pop()),
  'PUT /categorias/:id/portada': (body, url) => mockApi.setPortada(url.split('/')[2], body),
  'GET /inventario/completo': () => mockApi.getInventarioCompleto(),
  'POST /inventario/ajustes': (body) => mockApi.ajustarInventario(body),
  'GET /clientes': (params) => mockApi.getClientes(params),
  'POST /clientes': (body) => mockApi.crearCliente(body),
  'GET /pedidos': () => mockApi.getPedidos(),
  'GET /ventas/buscar': (params) => mockApi.buscarVentaPorFactura(params),
  'POST /devoluciones': (body) => mockApi.crearDevolucion(body),
  'GET /devoluciones': (params) => mockApi.getDevoluciones(params),
  'GET /devoluciones/:id': (params, url) => mockApi.getDevolucionDetalle(url.split('/').pop()),
  'GET /apartados': (params) => mockApi.getApartados(params),
  'POST /apartados': (body) => mockApi.crearApartado(body),
  'GET /apartados/:id': (params, url) => mockApi.getApartadoDetalle(url.split('/').pop()),
  'PUT /apartados/:id': (body, url) => mockApi.actualizarApartado(url.split('/').pop(), body),
  'POST /apartados/:id/abonos': (body, url) => mockApi.abonarApartado(url.split('/').pop(), body),
  'POST /apartados/:id/cancelar': (url) => mockApi.cancelarApartado(url.split('/').pop()),
  'GET /dueno/resumen': () => mockApi.getDuenoResumen(),
  'PUT /dueno/productos/:id/costo': (body, url) => mockApi.updateCosto(url.split('/').pop(), body),
}

// Busca el handler mock: primero coincidencia exacta; luego con :id dinámico
// (p. ej. PUT /productos/5 -> 'PUT /productos/:id', o /categorias/5/portada).
function mockHandler(method, url) {
  const exact = mockRoutes[`${method} ${url}`]
  if (exact) return exact
  const patron = url.replace(/\/\d+(?=\/|$)/g, '/:id')
  return mockRoutes[`${method} ${patron}`]
}

async function request(method, url, data) {
  if (USE_MOCK) {
    const handler = mockHandler(method, url)
    if (!handler) throw new Error(`[mock] Endpoint no implementado: ${method} ${url}`)
    return handler(data, url)
  }

  // Reintenta una vez solo lecturas (GET) ante caída de red o 5xx. Nunca se
  // reintentan POST/PUT/DELETE para no duplicar ventas, apartados o pedidos.
  const intentos = method === 'GET' ? 2 : 1
  let ultimoError

  for (let intento = 0; intento < intentos; intento++) {
    try {
      if (method === 'GET') {
        // Cache-buster: evita 404/JSON viejos cacheados por la CDN.
        return await http.get(url, { params: { ...(data || {}), _t: Date.now() } })
      }
      return await http.request({ method, url, data })
    } catch (err) {
      ultimoError = err
      const status = err?.status ?? 0
      const reintentable = status === 0 || status === 429 || status >= 500
      if (intento === intentos - 1 || !reintentable) break
      await esperar(ESPERA_REINTENTO_MS)
    }
  }

  throw ultimoError
}

export const authApi = {
  login: (credentials) => request('POST', '/login', credentials),
  // El logout real (POST /logout) se agrega cuando el backend esté listo;
  // por ahora el cierre de sesión es local en AuthContext.
}

export const catalogApi = {
  getSedes: () => request('GET', '/sedes'),
  getEmpleados: () => request('GET', '/empleados'),
  // Stock disponible (>0) de una sede: { sede_id }
  getInventario: (sedeId) => request('GET', '/inventario', { sede_id: sedeId }),
  getCategorias: () => request('GET', '/categorias', { _t: Date.now() }),
  getSubcategorias: () => request('GET', '/subcategorias'),
  // Matriz completa de stock por producto y sede (incluye 0)
  getInventarioCompleto: () => request('GET', '/inventario/completo'),
}

// Configuración compartida del diseño de etiquetas.
export const etiquetasApi = {
  getConfig: () => request('GET', '/configuracion/etiquetas'),
  updateConfig: (payload) => request('PUT', '/configuracion/etiquetas', payload),
}

export const productosApi = {
  list: (params) => request('GET', '/productos', params),
  create: (payload) => request('POST', '/productos', payload),
  update: (id, payload) => request('PUT', `/productos/${id}`, payload),
  remove: (id) => request('DELETE', `/productos/${id}`),
  // Stock por talla y sede para imprimir stickers.
  getStock: (id) => request('GET', `/productos/${id}/stock`),
  // Todos los productos de una categoría con stock por sede (orden de la web).
  getStickersCategoria: (params) => request('GET', '/stickers/categoria', params),
  // Define (o limpia con null) el producto que es portada de una categoría.
  setPortada: (categoriaId, productoId) =>
    request('PUT', `/categorias/${categoriaId}/portada`, { producto_id: productoId }),
}

export const inventarioApi = {
  // Ajuste manual por VARIANTE: { variante_id, sede_id, tipo: entrada|salida, cantidad, motivo? }
  ajustar: (payload) => request('POST', '/inventario/ajustes', payload),
}

export const imagenesApi = {
  // Sube una imagen. En modo mock devuelve la imagen como data URL (se guarda en
  // la sesión); en producción hace multipart POST al backend, que responde { imagen_url }.
  subir: async (file) => {
    if (USE_MOCK) return mockApi.subirImagen(file)
    const formData = new FormData()
    formData.append('imagen', file)
    return http.post('/imagenes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const ventasApi = {
  createVenta: (payload) => request('POST', '/ventas', payload),
  // Historial con paginación (Laravel-style). params: { periodo, fecha?, sede_id?, empleado_id?, tipo?, page?, per_page? }
  getHistorial: (params) => request('GET', '/ventas', params),
  // Agregados por día del mes + detalle del día. params: { mes, fecha?, sede_id?, empleado_id?, tipo? }
  getCalendario: (params) => request('GET', '/ventas/calendario', params),
  // Editar precios y pagos de una venta (solo usuario autorizado)
  update: (id, payload) => request('PUT', `/ventas/${id}`, payload),
  // Corregir el monto/método/vendedor de un abono de Plan Separe (solo Juan).
  updateAbono: (id, payload) => request('PUT', `/ventas/${id}/abono`, payload),
  // Revertir una venta completa: devuelve stock y elimina venta/factura/pagos.
  revertir: (id) => request('POST', `/ventas/${id}/revertir`),
  // Busca una venta por número de factura para precargar una devolución
  buscarPorFactura: (factura) => request('GET', '/ventas/buscar', { factura }),
}

export const devolucionesApi = {
  // Registrar un cambio: { venta_id, sede_id, empleado_id, devueltos[], cambios[], metodo_pago?, motivo? }
  registrar: (payload) => request('POST', '/devoluciones', payload),
  // Historial con paginación (Laravel-style). params: { periodo, sede_id?, empleado_id?, page?, per_page? }
  getHistorial: (params) => request('GET', '/devoluciones', params),
  getDetalle: (id) => request('GET', `/devoluciones/${id}`),
}

export const dashboardApi = {
  // Resumen del dashboard filtrado por periodo: dia | semana | mes
  getResumen: (periodo) => request('GET', '/dashboard', { periodo }),
}

export const comisionesApi = {
  // Ventas por vendedor (informativo, sin cálculo de comisión).
  // params: { periodo, sede_id? }
  getResumen: (params) => request('GET', '/comisiones', params),
}

export const clientesApi = {
  // Clientes (web + Plan Separe). Con ?q= filtra por nombre o cédula.
  getClientes: (params) => request('GET', '/clientes', params),
  create: (payload) => request('POST', '/clientes', payload),
}

export const apartadosApi = {
  // Plan Separe
  list: (params) => request('GET', '/apartados', params),
  create: (payload) => request('POST', '/apartados', payload),
  detalle: (id) => request('GET', `/apartados/${id}`),
  actualizar: (id, payload) => request('PUT', `/apartados/${id}`, payload),
  abonar: (id, payload) => request('POST', `/apartados/${id}/abonos`, payload),
  cancelar: (id) => request('POST', `/apartados/${id}/cancelar`),
}

export const pedidosApi = {
  // Pedidos online del sitio web (solo pagados)
  getPedidos: () => request('GET', '/pedidos'),
  // Marca (o libera, enviando cadena vacía) quién tomó el pedido.
  tomar: (id, tomadoPor) => request('POST', `/pedidos/${id}/tomar`, { tomado_por: tomadoPor }),
}

export const entregasApi = {
  // Domicilios contra entrega / entregas en prueba (pendientes por facturar).
  list: (params) => request('GET', '/entregas', params),
  resumen: () => request('GET', '/entregas/resumen'),
  create: (payload) => request('POST', '/entregas', payload),
  detalle: (id) => request('GET', `/entregas/${id}`),
  facturar: (id, payload) => request('POST', `/entregas/${id}/facturar`, payload),
  cancelar: (id) => request('POST', `/entregas/${id}/cancelar`),
}

export const duenoApi = {
  // Panel del dueño: resumen por sede + lista de productos con costo/stock
  getResumen: () => request('GET', '/dueno/resumen'),
  // Edita el costo de un producto: { costo } (null limpia el costo)
  updateCosto: (id, costo) => request('PUT', `/dueno/productos/${id}/costo`, { costo }),
}

export const codigosApi = {
  // Catálogo de códigos para armar el SKU: marcas, colores y estilos.
  // Cada catálogo (hombre / mujer) tiene su propio listado.
  getMarcas: (catalogo) => request('GET', '/marcas', catalogo ? { catalogo } : {}),
  createMarca: (payload) => request('POST', '/marcas', payload),
  updateMarca: (id, payload) => request('PUT', `/marcas/${id}`, payload),
  deleteMarca: (id) => request('DELETE', `/marcas/${id}`),

  getColores: (catalogo) => request('GET', '/colores', catalogo ? { catalogo } : {}),
  createColor: (payload) => request('POST', '/colores', payload),
  updateColor: (id, payload) => request('PUT', `/colores/${id}`, payload),
  deleteColor: (id) => request('DELETE', `/colores/${id}`),

  getEstilos: (prenda, catalogo) =>
    request('GET', '/estilos', {
      ...(prenda ? { prenda } : {}),
      ...(catalogo ? { catalogo } : {}),
    }),
  createEstilo: (payload) => request('POST', '/estilos', payload),
  updateEstilo: (id, payload) => request('PUT', `/estilos/${id}`, payload),
  deleteEstilo: (id) => request('DELETE', `/estilos/${id}`),
}

export default {
  authApi,
  catalogApi,
  productosApi,
  etiquetasApi,
  inventarioApi,
  imagenesApi,
  ventasApi,
  devolucionesApi,
  dashboardApi,
  comisionesApi,
  clientesApi,
  apartadosApi,
  pedidosApi,
  entregasApi,
  duenoApi,
  codigosApi,
}