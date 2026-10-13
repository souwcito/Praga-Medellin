import { useState } from 'react'
import { PackageIcon } from './icons'

// Imagen de producto con fallback: si no hay url o falla al cargar, muestra un
// placeholder estilizado en lugar del <img> roto. `className` define el tamaño
// y la forma (ej. "h-12 w-12 rounded-lg"); la imagen llena el contenedor.
export default function ProductImage({ src, alt = '', className = '' }) {
  const [rota, setRota] = useState(false)
  const sinImagen = !src || rota

  return (
    <div className={`relative shrink-0 overflow-hidden bg-surface-2 ${className}`}>
      {sinImagen ? (
        <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
          <PackageIcon className="h-1/3 w-1/3 text-ink-2/30" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setRota(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )
}