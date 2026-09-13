import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import logoPraga from '../assets/logo-praga.png'

// Cuenta única del panel (solo modo mock; el backend real valida credenciales).
const DEMO = { email: 'admin@praga.co', password: 'admin123' }

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Si venía de una ruta protegida, se regresa allí tras el login
  const from = location.state?.from?.pathname || '/dashboard'

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await login({ email, password })
    setSubmitting(false)
    if (result.ok) {
      navigate(from, { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-dark p-4">
      {/* Brillo de fondo muy sutil, en gris (solo negro/blanco/gris) */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Marca con el logo oficial (entra primero) */}
        <div className="animate-fade-up mb-8 flex flex-col items-center text-center">
          <img
            src={logoPraga}
            alt="Praga Medellín"
            className="h-24 w-24 rounded-full object-cover transition-transform duration-300 hover:scale-105"
          />
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-wide text-white">
            PRAGA
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.35em] text-white/50">
            Medellín · Panel interno
          </p>
        </div>

        {/* Tarjeta blanca sobre fondo oscuro: contraste negro/blanco de la marca */}
        <form
          onSubmit={handleSubmit}
          className="animate-fade-up space-y-4 rounded-2xl bg-white p-7 [animation-delay:80ms]"
        >
          {error && (
            <p className="animate-fade-in rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
              Correo
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@praga.co"
              className="w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink placeholder:text-ink-2/50 transition-all duration-200 hover:border-ink-2/40 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink placeholder:text-ink-2/50 transition-all duration-200 hover:border-ink-2/40 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-ink py-3 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:bg-metal-2 hover:shadow-lg hover:shadow-ink/20 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'Ingresando…' : 'Ingresar al panel'}
          </button>
        </form>

        <p className="animate-fade-in mt-4 text-center text-xs text-white/40 [animation-delay:160ms]">
          Cuenta de demostración:{' '}
          <button
            type="button"
            onClick={() => {
              setEmail(DEMO.email)
              setPassword(DEMO.password)
            }}
            className="font-medium text-white/60 underline underline-offset-2 transition-colors hover:text-white"
          >
            admin@praga.co · admin123
          </button>
        </p>
      </div>
    </div>
  )
}