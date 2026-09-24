import { useEffect, useRef } from 'react'

// Ejecuta una función cada intervaloMs mientras 'activo' sea true.
// La callback se guarda en una ref dentro de un effect para llamar siempre la
// versión más reciente sin reiniciar el intervalo.
export default function usePolling(callback, intervaloMs, activo = true) {
  const cb = useRef(callback)

  useEffect(() => {
    cb.current = callback
  }, [callback])

  useEffect(() => {
    if (!activo) return
    const id = setInterval(() => cb.current(), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs, activo])
}