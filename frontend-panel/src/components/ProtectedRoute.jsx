import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Guarda de rutas: sin sesión redirige a /login; con requiresAdmin solo deja pasar admins.
export default function ProtectedRoute({ children, requiresAdmin = false }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (requiresAdmin && user?.rol !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}