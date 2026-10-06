import { createPortal } from 'react-dom'

// Overlay de modal montado en <body> mediante portal.
//
// Es necesario porque los contenedores de las páginas usan `animate-fade-up`,
// que deja un `transform` en el elemento. Un ancestro con `transform` convierte
// a `position: fixed` en relativo a ESE contenedor (no al viewport), por lo que
// los modales aparecían centrados dentro de la página completa y tocaba hacer
// scroll para verlos. Al montarlos en <body> el `fixed` vuelve a ser viewport.
export default function Modal({ className = '', children, ...rest }) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={`fixed inset-0 ${className}`} {...rest}>
      {children}
    </div>,
    document.body,
  )
}
