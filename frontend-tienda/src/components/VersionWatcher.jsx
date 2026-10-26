import { useEffect } from 'react'

const INTERVALO_MS = 15000

// Detecta si se publicó una nueva versión mientras el usuario tiene la web
// abierta. Si cambia /version.json (lo genera cada build), recarga la página
// para que todos vean los cambios sin tener que hacer Ctrl+F5.
export default function VersionWatcher() {
  useEffect(() => {
    if (typeof window === 'undefined' || window.__PRAGA_PRERENDER__) return undefined

    let versionInicial = null
    let recargando = false
    let cancelado = false

    async function consultar() {
      if (cancelado || recargando) return
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        if (!res.ok) return
        const data = await res.json()
        const version = String(data?.version || '')
        if (!version) return

        if (versionInicial === null) {
          versionInicial = version
          return
        }
        if (version !== versionInicial) {
          // No interrumpir una compra en curso; se recarga al salir del checkout.
          if (window.location.pathname.startsWith('/checkout')) return
          recargando = true
          window.location.reload()
        }
      } catch {
        /* sin conexión o build antiguo sin version.json: no hacer nada */
      }
    }

    consultar()
    const timer = window.setInterval(consultar, INTERVALO_MS)
    const alVolver = () => {
      if (document.visibilityState === 'visible') consultar()
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', consultar)

    return () => {
      cancelado = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', consultar)
    }
  }, [])

  return null
}
