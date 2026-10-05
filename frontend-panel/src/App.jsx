import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import { useAuth } from './hooks/useAuth'

// Carga diferida (code-splitting): el Login queda liviano y las pantallas
// pesadas (Dashboard con Recharts, POS) se descargan solo al entrar.
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Pos = lazy(() => import('./pages/Pos'))
const Comisiones = lazy(() => import('./pages/Comisiones'))
const Ventas = lazy(() => import('./pages/Ventas'))
const Inventario = lazy(() => import('./pages/Inventario'))
const Productos = lazy(() => import('./pages/Productos'))
const Pedidos = lazy(() => import('./pages/Pedidos'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Devoluciones = lazy(() => import('./pages/Devoluciones'))
const Dueno = lazy(() => import('./pages/Dueno'))
const DuenoProductos = lazy(() => import('./pages/DuenoProductos'))

function PageFallback() {
  return (
    <div className="grid min-h-screen place-items-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
    </div>
  )
}

// Ruta por defecto según el rol: el dueño aterriza en su panel.
function Inicio() {
  const { user } = useAuth()
  return <Navigate to={user?.rol === 'dueno' ? '/dueno' : '/dashboard'} replace />
}

export default function App() {
  return (
    <BrowserRouter basename="/panel">
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pos" element={<Pos />} />
            <Route
              path="/productos"
              element={
                <ProtectedRoute requiresAdmin>
                  <Productos />
                </ProtectedRoute>
              }
            />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/comisiones" element={<Comisiones />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/devoluciones" element={<Devoluciones />} />

            {/* Panel del dueño (rol 'dueno') */}
            <Route
              path="/dueno"
              element={
                <ProtectedRoute requiresOwner>
                  <Dueno />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dueno/productos"
              element={
                <ProtectedRoute requiresOwner>
                  <DuenoProductos />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Inicio />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}