// Capa de datos con React Query: caché compartida entre páginas (sedes,
// empleados, catálogo se piden una sola vez), deduplicación y polling que se
// pausa automáticamente cuando la pestaña no está visible.
import { useQuery } from '@tanstack/react-query'
import {
  catalogApi,
  productosApi,
  dashboardApi,
  comisionesApi,
  ventasApi,
  devolucionesApi,
  clientesApi,
  pedidosApi,
  duenoApi,
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

export const useInventarioCompleto = () =>
  useQuery({
    queryKey: ['inventario-completo'],
    queryFn: catalogApi.getInventarioCompleto,
    staleTime: TTL_INVENTARIO,
  })

export const useProductos = (params) =>
  useQuery({
    queryKey: ['productos', params],
    queryFn: () => productosApi.list(params),
    staleTime: 20000,
  })

export const useVentas = (params) =>
  useQuery({
    queryKey: ['ventas', params],
    queryFn: () => ventasApi.getHistorial(params),
    staleTime: 15000,
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

export const useClientes = () =>
  useQuery({ queryKey: ['clientes'], queryFn: clientesApi.getClientes, staleTime: 30000 })

export const usePedidos = () =>
  useQuery({ queryKey: ['pedidos'], queryFn: pedidosApi.getPedidos, staleTime: 30000 })

export const useDuenoResumen = () =>
  useQuery({ queryKey: ['dueno-resumen'], queryFn: duenoApi.getResumen, staleTime: 15000 })