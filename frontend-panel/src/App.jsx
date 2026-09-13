import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pos from './pages/Pos'
import PlaceholderPage from './pages/PlaceholderPage'

export default function App() {
  return (
    <BrowserRouter>
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
                <PlaceholderPage title="Productos" description="CRUD de productos, solo administradores." />
              </ProtectedRoute>
            }
          />
          <Route path="/inventario" element={<PlaceholderPage title="Inventario" />} />
          <Route path="/ventas" element={<PlaceholderPage title="Historial de ventas" />} />
          <Route path="/comisiones" element={<PlaceholderPage title="Comisiones" />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}