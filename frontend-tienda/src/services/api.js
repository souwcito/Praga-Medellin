// Cliente centralizado hacia la API REST pública (Laravel).
// Con VITE_USE_MOCK=true usa datos simulados; con false hace fetch real a VITE_API_URL.
import axios from 'axios'
import mockApi from './mockApi'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const API_URL = import.meta.env.VITE_API_URL || ''

const http = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

http.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err.response?.data ?? err),
)

const mockRoutes = {
  'GET /categorias': () => mockApi.getCategorias(),
  'GET /subcategorias': () => mockApi.getSubcategorias(),
  'GET /productos': (params) => mockApi.getProductos(params),
  'GET /productos/:id': (params, url) => mockApi.getProducto(url.split('/').pop()),
  'POST /pedidos': (body) => mockApi.createPedido(body),
}

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

export const catalogApi = {
  getCategorias: () => request('GET', '/categorias'),
  getSubcategorias: () => request('GET', '/subcategorias'),
  getProductos: (params) => request('GET', '/productos', params),
  getProducto: (id) => request('GET', `/productos/${id}`),
}

export const pedidosApi = {
  create: (payload) => request('POST', '/pedidos', payload),
}

export default {
  catalogApi,
  pedidosApi,
}