import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Guarda de rutas: sin sesión redirige a /login; con requiresAdmin solo deja
// pasar a roles de gestión (admin o dueno); con requiresOwner solo al dueño.
export default function ProtectedRoute({ children, requiresAdmin = false, requiresOwner = false }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (requiresOwner && user?.rol !== 'dueno') {
    return <Navigate to="/dashboard" replace />
  }

  if (requiresAdmin && !['admin', 'dueno'].includes(user?.rol)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}