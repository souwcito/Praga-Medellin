// Capa de datos con React Query: caché compartida entre páginas (sedes,
// empleados, catálogo se piden una sola vez), deduplicación y polling que se
// pausa automáticamente cuando la pestaña no está visible.
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  catalogApi,
  productosApi,
  etiquetasApi,
  dashboardApi,
  comisionesApi,
  ventasApi,
  devolucionesApi,
  clientesApi,
  pedidosApi,
  apartadosApi,
  entregasApi,
  duenoApi,
  codigosApi,
} from '../services/api'

const TTL_CATALOGO = 30 * 1000 // 30 s
const TTL_INVENTARIO = 15 * 1000 // 15 s
const TTL_ESTABLE = 60 * 60 * 1000 // 1 h (categorías/subcategorías cambian poco)

export const useSedes = () =>
  useQuery({ queryKey: ['sedes'], queryFn: catalogApi.getSedes, staleTime: TTL_CATALOGO })

export const useEmpleados = () =>
  useQuery({ queryKey: ['empleados'], queryFn: catalogApi.getEmpleados, staleTime: TTL_CATALOGO })

export const useCategorias = () =>
  useQuery({ queryKey: ['categorias'], queryFn: catalogApi.getCategorias, staleTime: TTL_ESTABLE })

export const useSubcategorias = () =>
  useQuery({ queryKey: ['subcategorias'], queryFn: catalogApi.getSubcategorias, staleTime: TTL_ESTABLE })

// Inventario de una sede. `refetchInterval` (p. ej. 20000) activa el polling del
// POS; React Query lo pausa automáticamente si la pestaña no es visible.
export const useInventarioSede = (sedeId, { refetchInterval } = {}) =>
  useQuery({
    queryKey: ['inventario', sedeId],
    queryFn: () => catalogApi.getInventario(sedeId),
    enabled: Boolean(sedeId),
    staleTime: TTL_INVENTARIO,
    refetchInterval,
  })

export const useInventarioCompleto = (options = {}) =>
  useQuery({
    queryKey: ['inventario-completo'],
    queryFn: catalogApi.getInventarioCompleto,
    staleTime: TTL_INVENTARIO,
    ...options,
  })

export const useProductos = (params) =>
  useQuery({
    queryKey: ['productos', params],
    queryFn: () => productosApi.list(params),
    staleTime: 20000,
  })

export const useStockProducto = (productoId) =>
  useQuery({
    queryKey: ['producto-stock', productoId],
    queryFn: () => productosApi.getStock(productoId),
    staleTime: 10000,
    enabled: Boolean(productoId),
  })

export const useStickersCategoria = (params, { enabled } = {}) =>
  useQuery({
    queryKey: ['stickers-categoria', params],
    queryFn: () => productosApi.getStickersCategoria(params),
    staleTime: 10000,
    enabled,
  })

// Configuración compartida de etiquetas (servidor). La configuración física
// propia de cada PC/impresora se guarda en localStorage.
export const useConfiguracionEtiquetas = () =>
  useQuery({
    queryKey: ['configuracion-etiquetas'],
    queryFn: etiquetasApi.getConfig,
    staleTime: 60000,
  })

export const useVentas = (params, { enabled } = {}) =>
  useQuery({
    queryKey: ['ventas', params],
    queryFn: () => ventasApi.getHistorial(params),
    staleTime: 15000,
    placeholderData: keepPreviousData,
    enabled,
  })

export const useCalendarioVentas = (params) =>
  useQuery({
    queryKey: ['ventas-calendario', params],
    queryFn: () => ventasApi.getCalendario(params),
    staleTime: 15000,
    placeholderData: keepPreviousData,
  })

export const useDevoluciones = (params) =>
  useQuery({
    queryKey: ['devoluciones', params],
    queryFn: () => devolucionesApi.getHistorial(params),
    staleTime: 15000,
  })

export const useDevolucionDetalle = (id) =>
  useQuery({
    queryKey: ['devolucion', id],
    queryFn: () => devolucionesApi.getDetalle(id),
    enabled: Boolean(id),
    staleTime: 30000,
  })

export const useDashboard = (periodo) =>
  useQuery({
    queryKey: ['dashboard', periodo],
    queryFn: () => dashboardApi.getResumen(periodo),
    staleTime: 15000,
  })

export const useComisiones = (params) =>
  useQuery({
    queryKey: ['comisiones', params],
    queryFn: () => comisionesApi.getResumen(params),
    staleTime: 15000,
  })

export const useClientes = (q) =>
  useQuery({
    queryKey: ['clientes', q || ''],
    queryFn: () => clientesApi.getClientes(q ? { q } : {}),
    staleTime: 15000,
  })

export const useApartados = (params) =>
  useQuery({
    queryKey: ['apartados', params],
    queryFn: () => apartadosApi.list(params),
    staleTime: 15000,
  })

export const usePedidos = () =>
  useQuery({ queryKey: ['pedidos'], queryFn: pedidosApi.getPedidos, staleTime: 30000 })

// Domicilios contra entrega: listado, detalle y contador para menú/dashboard.
export const useEntregas = (params) =>
  useQuery({
    queryKey: ['entregas', params],
    queryFn: () => entregasApi.list(params),
    staleTime: 10000,
    keepPreviousData: true,
  })

export const useEntregaDetalle = (id) =>
  useQuery({
    queryKey: ['entrega', id],
    queryFn: () => entregasApi.detalle(id),
    enabled: Boolean(id),
    staleTime: 5000,
  })

export const useEntregasResumen = () =>
  useQuery({
    queryKey: ['entregas-resumen'],
    queryFn: entregasApi.resumen,
    staleTime: 30000,
    refetchInterval: 60000,
  })

export const useDuenoResumen = () =>
  useQuery({ queryKey: ['dueno-resumen'], queryFn: duenoApi.getResumen, staleTime: 15000 })

// Catálogo de códigos (marcas, colores, estilos). Se filtran por catálogo:
// hombre y mujer tienen listados independientes.
export const useMarcas = (catalogo) =>
  useQuery({
    queryKey: ['marcas', catalogo || ''],
    queryFn: () => codigosApi.getMarcas(catalogo),
    staleTime: TTL_CATALOGO,
  })

export const useColores = (catalogo) =>
  useQuery({
    queryKey: ['colores', catalogo || ''],
    queryFn: () => codigosApi.getColores(catalogo),
    staleTime: TTL_CATALOGO,
  })

export const useEstilos = (prenda, catalogo) =>
  useQuery({
    queryKey: ['estilos', prenda || '', catalogo || ''],
    queryFn: () => codigosApi.getEstilos(prenda, catalogo),
    staleTime: TTL_CATALOGO,
  })