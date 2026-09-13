import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import PlaceholderPage from './pages/PlaceholderPage'

// Carga diferida (code-splitting): el Login queda liviano y las pantallas
// pesadas (Dashboard con Recharts, POS) se descargan solo al entrar.
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Pos = lazy(() => import('./pages/Pos'))
const Comisiones = lazy(() => import('./pages/Comisiones'))
const Ventas = lazy(() => import('./pages/Ventas'))

function PageFallback() {
  return (
    <div className="grid min-h-screen place-items-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
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
                  <PlaceholderPage
                    title="Productos"
                    description="CRUD de productos, solo administradores."
                  />
                </ProtectedRoute>
              }
            />
            <Route path="/inventario" element={<PlaceholderPage title="Inventario" />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/comisiones" element={<Comisiones />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}