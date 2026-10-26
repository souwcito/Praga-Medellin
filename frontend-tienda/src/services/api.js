// Cliente centralizado hacia la API REST pública (Laravel).
// Con VITE_USE_MOCK=true usa datos simulados; con false hace fetch real a VITE_API_URL.
import axios from 'axios'
import mockApi from './mockApi'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const CONFIGURED_API_URL = import.meta.env.VITE_API_URL || ''

// En producción hablamos con la API en el MISMO origen (/api). Así funciona
// igual en pragamedellin.com, www.pragamedellin.com, el navegador interno de
// Instagram (que a veces no manda un Origin válido) y cualquier dominio/preview.
// En local y durante el prerender (localhost/127.0.0.1) usamos la URL absoluta
// del .env para no romper el desarrollo ni la generación de páginas SEO.
function resolveApiUrl() {
  if (typeof window === 'undefined') return CONFIGURED_API_URL
  const host = window.location.hostname
  const esLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  return esLocal ? CONFIGURED_API_URL : '/api'
}

const API_URL = resolveApiUrl()

const http = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// Convierte cualquier fallo en un error con un mensaje claro. Evita que la UI
// muestre HTML crudo del servidor o se quede sin mensaje (p. ej. dentro de
// Instagram, donde una petición bloqueada puede llegar vacía).
function normalizarError(err) {
  const data = err?.response?.data
  const status = err?.response?.status ?? 0

  if (data && typeof data === 'object') {
    const mensaje = data.message || data.error
    if (mensaje) return { ...data, status, message: mensaje }
  }

  if (status >= 500) {
    return {
      status,
      message: 'La tienda está presentando problemas. Intenta de nuevo en unos segundos.',
    }
  }

  if (typeof data === 'string' && data.trim() !== '') {
    return {
      status,
      message: 'El servidor no respondió correctamente. Intenta de nuevo.',
    }
  }

  if (err?.code === 'ECONNABORTED') {
    return {
      status,
      message: 'La conexión tardó demasiado. Revisa tu internet e intenta de nuevo.',
    }
  }

  if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK') {
    return {
      status,
      message: 'No pudimos conectar con la tienda. Revisa tu conexión e intenta de nuevo.',
    }
  }

  return {
    status,
    message: err?.message || 'No se pudo conectar con la tienda. Intenta de nuevo.',
  }
}

http.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(normalizarError(err)),
)

const ESPERA_REINTENTO_MS = 900

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const mockRoutes = {
  'GET /categorias': () => mockApi.getCategorias(),
  'GET /subcategorias': () => mockApi.getSubcategorias(),
  'GET /productos': (params) => mockApi.getProductos(params),
  'GET /productos/:id': (params, url) => mockApi.getProducto(url.split('/').pop()),
  'POST /pedidos': (body) => mockApi.createPedido(body),
  'POST /pedidos/:numero/wompi': (body, url) => mockApi.pedidoWompi(url.split('/')[2], body),
  'POST /pedidos/:numero/confirmar': (body, url) => mockApi.confirmarPedido(url.split('/')[2], body),
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

  // Los GET se reintentan una vez ante fallos de red o errores 5xx (passing
  // transitorios de Hostinger/Instagram). Los POST/PUT/DELETE no se reintentan
  // para no duplicar ventas, pedidos ni apartados.
  const intentos = method === 'GET' ? 2 : 1
  let ultimoError

  for (let intento = 0; intento < intentos; intento++) {
    try {
      if (method === 'GET') {
        // Cache-buster: evita que la CDN de Hostinger sirva un 404/JSON viejo
        // de una URL exacta que quedó cacheada de un deploy anterior.
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

export const catalogApi = {
  // Cache-buster: la portada de categoría se cambia desde el panel y debe verse
  // al instante; un parámetro único evita que la CDN/navegador sirva una copia vieja.
  getCategorias: () => request('GET', '/categorias', { _t: Date.now() }),
  getSubcategorias: () => request('GET', '/subcategorias'),
  getProductos: (params) => request('GET', '/productos', params),
  getProducto: (id) => request('GET', `/productos/${id}`),
}

export const pedidosApi = {
  create: (payload) => request('POST', '/pedidos', payload),
  wompiConfig: (numero) => request('POST', `/pedidos/${numero}/wompi`),
  confirmar: (numero, payload) => request('POST', `/pedidos/${numero}/confirmar`, payload),
}

export default {
  catalogApi,
  pedidosApi,
}