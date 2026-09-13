// Cliente centralizado hacia la API REST del backend (Laravel + Sanctum).
// - Con VITE_USE_MOCK=true responde con datos simulados (mockApi.js).
// - Con VITE_USE_MOCK=false hace fetch real a VITE_API_URL con token Bearer.
// Para conectar el backend real solo se cambia el .env y se agregan las rutas a mockRoutes.

import axios from 'axios'
import mockApi from './mockApi'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const API_URL = import.meta.env.VITE_API_URL || ''

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
}

async function request(method, url, data) {
  if (USE_MOCK) {
    const handler = mockRoutes[`${method} ${url}`]
    if (!handler) throw new Error(`[mock] Endpoint no implementado: ${method} ${url}`)
    return handler(data)
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
}

export const ventasApi = {
  createVenta: (payload) => request('POST', '/ventas', payload),
}

export const dashboardApi = {
  // Resumen del dashboard filtrado por periodo: dia | semana | mes
  getResumen: (periodo) => request('GET', '/dashboard', { periodo }),
}

export default {
  authApi,
  catalogApi,
  ventasApi,
  dashboardApi,
}