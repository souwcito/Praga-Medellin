import { useCallback, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { authApi } from '../services/api'

// Proveedor del estado global de autenticación: token + usuario (rol y sede) en localStorage.
function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('praga_user'))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('praga_token'))
  const [user, setUser] = useState(readStoredUser)
  const [loginError, setLoginError] = useState(null)

  const login = useCallback(async ({ email, password }) => {
    setLoginError(null)
    try {
      const data = await authApi.login({ email, password })
      localStorage.setItem('praga_token', data.token)
      localStorage.setItem('praga_user', JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
      return { ok: true, user: data.user }
    } catch (err) {
      const message = err?.message || 'No se pudo iniciar sesión'
      setLoginError(message)
      return { ok: false, error: message }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('praga_token')
    localStorage.removeItem('praga_user')
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      loginError,
      login,
      logout,
    }),
    [token, user, loginError, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}