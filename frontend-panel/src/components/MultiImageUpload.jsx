// Subida de MÚLTIPLES imágenes de un producto (archivo, no por URL).
// Acepta JPG, PNG, WebP y HEIC/HEIF (las fotos HEIC de iPhone se convierten a
// JPEG en un Web Worker y luego se comprimen antes de subir).
// Permite arrastrar o elegir varios archivos y los sube en paralelo (con límite).
import { useRef, useState } from 'react'
import { imagenesApi } from '../services/api'
import { prepararArchivoImagen, subirConLimite, urlImagen } from '../utils/imagenes'
import { AlertIcon, PlusIcon, UploadIcon, XIcon } from './icons'

const MAX_MB = 25
const MAX_ARCHIVOS = 5
const INPUT_ID = 'imagenes-producto'

export default function MultiImageUpload({ value = [], onChange }) {
  const inputRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState(null)

  async function subirArchivo(file) {
    const preparado = await prepararArchivoImagen(file)
    const res = await imagenesApi.subir(preparado)
    return res.imagen_url
  }

  async function subirTodos(files) {
    const validos = files.filter(
      (f) =>
        f.type.startsWith('image/') ||
        /\.(heic|heif)$/i.test(f.name),
    )
    if (validos.length === 0) {
      setError('Los archivos deben ser imágenes')
      return
    }
    const demasiadoGrandes = validos.filter((f) => f.size > MAX_MB * 1024 * 1024)
    if (demasiadoGrandes.length > 0) {
      setError(`Cada imagen debe pesar menos de ${MAX_MB} MB`)
      return
    }

    setSubiendo(true)
    setError(null)
    setProgreso('0 de ' + validos.length)
    let completadas = 0

    const { urls, errores } = await subirConLimite(
      validos,
      async (f) => {
        const url = await subirArchivo(f)
        completadas++
        setProgreso(`${completadas} de ${validos.length}`)
        return url
      },
      3,
    )

    if (urls.length > 0) onChange([...value, ...urls])
    if (errores.length > 0) setError(errores[0])
    setSubiendo(false)
    setProgreso('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDrop(e) {
    e.preventDefault()
    const archivos = Array.from(e.dataTransfer?.files || []).slice(0, MAX_ARCHIVOS)
    subirTodos(archivos)
  }

  function quitar(idx) {
    onChange(value.filter((_, i) => i !== idx))
  }

  const label = subiendo
    ? `Subiendo imagen… ${progreso}`
    : value.length === 0
      ? 'Subir imágenes del producto'
      : 'Agregar otra imagen'

  return (
    <div>
      <input
        id={INPUT_ID}
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={(e) => subirTodos(Array.from(e.target.files || []))}
      />

      {value.length > 0 && (
        <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {value.map((url, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-lg border border-line bg-surface-2"
            >
              <img
                src={urlImagen(url)}
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
        <span className="flex items-center gap-1 font-medium">
          <PlusIcon className="h-4 w-4" />
          {label}
        </span>
        <span className="text-xs text-ink-2/60">
          JPG, PNG, WebP o HEIC (iPhone) · sube varias a la vez · la primera es la principal
        </span>
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