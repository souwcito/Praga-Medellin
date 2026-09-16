// Subida de imagen del producto desde el administrador de archivos (no por URL).
// En modo mock se guarda como data URL; en producción el backend devuelve la URL.
import { useRef, useState } from 'react'
import { imagenesApi } from '../services/api'
import { AlertIcon, UploadIcon, XIcon } from './icons'

const MAX_MB = 3
const INPUT_ID = 'imagen-producto'

export default function ImageUpload({ value, onChange }) {
  const inputRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState(null)

  async function subir(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
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
      const res = await imagenesApi.subir(file)
      onChange(res.imagen_url)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError(err?.message || 'No se pudo subir la imagen')
    } finally {
      setSubiendo(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    subir(e.dataTransfer?.files?.[0])
  }

  return (
    <div>
      <input
        id={INPUT_ID}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => subir(e.target.files?.[0])}
      />

      {value ? (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt="Imagen del producto"
            className="h-14 w-14 shrink-0 rounded-lg bg-surface-2 object-cover"
          />
          <label
            htmlFor={INPUT_ID}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 active:scale-[0.98]"
          >
            <UploadIcon className="h-4 w-4" />
            Reemplazar
          </label>
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex items-center gap-1 text-sm text-ink-2/70 transition-colors hover:text-red-700"
          >
            <XIcon className="h-4 w-4" />
            Quitar
          </button>
        </div>
      ) : (
        <label
          htmlFor={INPUT_ID}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-surface-2/50 px-4 py-6 text-center text-sm text-ink-2 transition-colors hover:border-metal hover:bg-surface-2"
        >
          <UploadIcon className="h-6 w-6 text-ink-2/60" />
          {subiendo ? 'Subiendo imagen…' : 'Haz clic o arrastra la imagen aquí'}
          <span className="text-xs text-ink-2/60">PNG o JPG · máx. {MAX_MB} MB</span>
        </label>
      )}

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-700">
          <AlertIcon className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}