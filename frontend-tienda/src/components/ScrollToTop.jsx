import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Vuelve al inicio de la página al cambiar de ruta, EXCEPTO cuando el usuario
// usa el botón atrás/adelante del navegador (POP): en ese caso se conserva la
// posición del scroll para no perder el punto donde estaba.
export default function ScrollToTop() {
  const { pathname, search } = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    if (navType === 'POP') return
    window.scrollTo(0, 0)
  }, [pathname, search, navType])

  return null
}
