import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Guarda de rutas: sin sesión redirige a /login; con requiresAdmin solo deja
// pasar admins; con requiresOwner solo deja pasar al dueño (rol 'dueno').
export default function ProtectedRoute({ children, requiresAdmin = false, requiresOwner = false }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (requiresOwner && user?.rol !== 'dueno') {
    return <Navigate to="/dashboard" replace />
  }

  if (requiresAdmin && user?.rol !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}