// Cliente centralizado hacia la API REST del backend (Laravel + Sanctum).
// - Con VITE_USE_MOCK=true responde con datos simulados (mockApi.js).
// - Con VITE_USE_MOCK=false hace fetch real a VITE_API_URL con token Bearer.
// Para conectar el backend real solo se cambia el .env y se agregan las rutas a mockRoutes.

import axios from 'axios'
import mockApi from './mockApi'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const API_URL = import.meta.env.VITE_API_URL || ''

// Expuesto para que la UI (ej. hint de login) se adapte al modo
export { USE_MOCK }

const http = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// Inyecta el token Bearer en cada petición real
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('praga_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Simplifica el manejo: siempre se recibe el cuerpo de la respuesta (res.data)
http.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err.response?.data ?? err),
)

// Rutas disponibles en modo mock (crecen con cada funcionalidad).
// La llave sigue el formato "METODO /ruta" del endpoint real.
const mockRoutes = {
  'POST /login': (body) => mockApi.login(body),
  'GET /sedes': () => mockApi.getSedes(),
  'GET /empleados': () => mockApi.getEmpleados(),
  'GET /inventario': (params) => mockApi.getInventario(params),
  'POST /ventas': (body) => mockApi.createVenta(body),
  'GET /dashboard': (params) => mockApi.getDashboard(params),
  'GET /comisiones': (params) => mockApi.getComisiones(params),
  'GET /ventas': (params) => mockApi.getVentas(params),
  'GET /categorias': () => mockApi.getCategorias(),
  'GET /subcategorias': () => mockApi.getSubcategorias(),
  'GET /productos': (params) => mockApi.getProductos(params),
  'POST /productos': (body) => mockApi.createProducto(body),
  'PUT /productos/:id': (body, url) => mockApi.updateProducto(url.split('/').pop(), body),
  'DELETE /productos/:id': (url) => mockApi.deleteProducto(url.split('/').pop()),
  'GET /inventario/completo': () => mockApi.getInventarioCompleto(),
  'POST /inventario/ajustes': (body) => mockApi.ajustarInventario(body),
}

// Busca el handler mock: primero coincidencia exacta; luego con :id dinámico
// (p. ej. PUT /productos/5 -> 'PUT /productos/:id').
function mockHandler(method, url) {
  const exact = mockRoutes[`${method} ${url}`]
  if (exact) return exact
  const patron = url.replace(/\/\d+$/, '/:id')
  return mockRoutes[`${method} ${patron}`]
}

async function request(method, url, data) {
  if (USE_MOCK) {
    const handler = mockHandler(method, url)
    if (!handler) throw new Error(`[mock] Endpoint no implementado: ${method} ${url}`)
    return handler(data, url)
  }
  if (method === 'GET') return http.get(url, { params: data })
  return http.request({ method, url, data })
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
  getCategorias: () => request('GET', '/categorias'),
  getSubcategorias: () => request('GET', '/subcategorias'),
  // Matriz completa de stock por producto y sede (incluye 0)
  getInventarioCompleto: () => request('GET', '/inventario/completo'),
}

export const productosApi = {
  list: (params) => request('GET', '/productos', params),
  create: (payload) => request('POST', '/productos', payload),
  update: (id, payload) => request('PUT', `/productos/${id}`, payload),
  remove: (id) => request('DELETE', `/productos/${id}`),
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
  // Historial con paginación (Laravel-style). params: { periodo, sede_id?, empleado_id?, tipo?, page?, per_page? }
  getHistorial: (params) => request('GET', '/ventas', params),
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

export default {
  authApi,
  catalogApi,
  productosApi,
  inventarioApi,
  imagenesApi,
  ventasApi,
  dashboardApi,
  comisionesApi,
}