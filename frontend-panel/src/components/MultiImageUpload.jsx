// Subida de MÚLTIPLES imágenes de un producto (archivo, no por URL).
// Acepta JPG, PNG, WebP y HEIC/HEIF (las fotos HEIC de iPhone se convierten a
// JPEG en el navegador antes de subir para que se vean en la tienda).
import { useRef, useState } from 'react'
import { imagenesApi } from '../services/api'
import { prepararArchivoImagen } from '../utils/imagenes'
import { AlertIcon, PlusIcon, UploadIcon, XIcon } from './icons'

const MAX_MB = 10
const INPUT_ID = 'imagenes-producto'

export default function MultiImageUpload({ value = [], onChange }) {
  const inputRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState(null)

  async function subir(file) {
    if (!file) return
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      setError('El archivo debe ser una imagen')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen debe pesar menos de ${MAX_MB} MB`)
      return
    }
    setSubiendo(true)
    setError(null)
    try {
      const lista = await Promise.all([file].map(prepararArchivoImagen))
      const res = await imagenesApi.subir(lista[0])
      onChange([...value, res.imagen_url])
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError(err?.message || 'No se pudo subir la imagen')
    } finally {
      setSubiendo(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    const archivos = Array.from(e.dataTransfer?.files || []).slice(0, 5)
    if (archivos.length === 1) subir(archivos[0])
    else setError('Suelta las imágenes una a la vez')
  }

  function quitar(idx) {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <input
        id={INPUT_ID}
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => subir(e.target.files?.[0])}
      />

      {value.length > 0 && (
        <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {value.map((url, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-lg border border-line bg-surface-2"
            >
              <img
                src={url}
                alt={`Imagen ${idx + 1}`}
                className="aspect-square h-full w-full object-cover"
              />
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-ink/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                  Principal
                </span>
              )}
              <button
                type="button"
                onClick={() => quitar(idx)}
                title="Quitar imagen"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-700/90 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <label
        htmlFor={INPUT_ID}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-surface-2/50 px-4 py-5 text-center text-sm text-ink-2 transition-colors hover:border-metal hover:bg-surface-2"
      >
        <UploadIcon className="h-6 w-6 text-ink-2/60" />
        {subiendo ? (
          'Subiendo imagen…'
        ) : (
          <>
            <span className="flex items-center gap-1 font-medium">
              <PlusIcon className="h-4 w-4" />
              {value.length === 0 ? 'Subir imágenes del producto' : 'Agregar otra imagen'}
            </span>
            <span className="text-xs text-ink-2/60">
              JPG, PNG, WebP o HEIC (iPhone) · máx. {MAX_MB} MB · la primera es la principal
            </span>
          </>
        )}
      </label>

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-700">
          <AlertIcon className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}