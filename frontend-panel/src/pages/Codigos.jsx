import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { codigosApi } from '../services/api'
import { useColores, useEstilos, useMarcas } from '../hooks/useData'
import Modal from '../components/Modal'
import { AlertIcon, EditIcon, PlusIcon, TrashIcon, XIcon } from '../components/icons'
import { siguienteCodigo } from '../utils/codigos'

const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-2/50 focus:border-metal focus:outline-none focus:ring-2 focus:ring-metal/25'

// Prendas (código de 3 letras) para agrupar los estilos, por catálogo.
export const PRENDAS_POR_CATALOGO = {
  hombre: [
    { value: 'GOR', label: 'Gorras' },
    { value: 'BOL', label: 'Bolsos' },
    { value: 'ZAP', label: 'Zapatos / Tenis' },
    { value: 'CHA', label: 'Chanclas' },
    { value: 'CAM', label: 'Camisas / Camisetas' },
    { value: 'BUZ', label: 'Buzos' },
    { value: 'CON', label: 'Conjuntos' },
    { value: 'SUD', label: 'Sudaderas' },
    { value: 'PER', label: 'Perfumes' },
    { value: 'REL', label: 'Relojes' },
    { value: 'PAN', label: 'Pantalonetas' },
  ],
  mujer: [
    { value: 'BLU', label: 'Blusas' },
    { value: 'BLS', label: 'Blusones' },
    { value: 'BLC', label: 'Blusones cortos' },
    { value: 'BOD', label: 'Bodys' },
    { value: 'SET', label: 'Sets' },
    { value: 'FAL', label: 'Faldas y shorts' },
    { value: 'CHQ', label: 'Chaquetas' },
    { value: 'VES', label: 'Vestidos' },
    { value: 'JEA', label: 'Jeans' },
    { value: 'CAM', label: 'Camisas / Camisetas' },
    { value: 'BIL', label: 'Billeteras' },
    { value: 'BOL', label: 'Bolsos' },
    { value: 'ZAP', label: 'Zapatos / Tenis' },
    { value: 'CHA', label: 'Chanclas' },
    { value: 'CON', label: 'Conjuntos' },
    { value: 'PER', label: 'Perfumes' },
    { value: 'REL', label: 'Relojes' },
  ],
}

const CATALOGOS = [
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
]

const TABS = [
  { id: 'marcas', label: 'Marcas' },
  { id: 'estilos', label: 'Estilos' },
  { id: 'colores', label: 'Colores' },
]

// Sección genérica de CRUD (marcas / estilos / colores).
function Seccion({ titulo, descripcion, items, campos, queryKey, api, prenda, prendas, catalogo }) {
  const queryClient = useQueryClient()
  const [editando, setEditando] = useState(null) // { id|null, valores }
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const inval = () => queryClient.invalidateQueries({ queryKey: [queryKey] })

  function abrirNuevo() {
    const v = {}
    const siguiente = siguienteCodigo((items || []).map((i) => i.codigo))
    campos.forEach((c) => {
      if (c.key === 'prenda') v[c.key] = prenda || prendas?.[0]?.value || ''
      else if (c.key === 'codigo') v[c.key] = siguiente
      else v[c.key] = ''
    })
    setEditando({ id: null, valores: v })
    setError(null)
  }

  function abrirEditar(it) {
    const v = {}
    campos.forEach((c) => {
      v[c.key] = it[c.key] ?? ''
    })
    setEditando({ id: it.id, valores: v })
    setError(null)
  }

  async function guardar() {
    if (!editando) return
    for (const c of campos) {
      if (!String(editando.valores[c.key] ?? '').trim()) {
        setError(`Completa "${c.label}".`)
        return
      }
    }
    setGuardando(true)
    setError(null)
    try {
      const payload = { ...editando.valores, catalogo }
      if (editando.id) await api.update(editando.id, payload)
      else await api.create(payload)
      inval()
      setEditando(null)
    } catch (err) {
      setError(err?.error || err?.message || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(it) {
    if (!window.confirm(`¿Eliminar "${it.nombre}"?`)) return
    try {
      await api.remove(it.id)
      inval()
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{titulo}</h2>
          <p className="text-xs text-ink-2">{descripcion}</p>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-metal-2 active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4" /> Agregar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="grid h-24 place-items-center rounded-xl border border-dashed border-line text-sm text-ink-2/70">
          No hay registros todavía.
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-line">
          <ul className="divide-y divide-line">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-14 shrink-0 font-mono text-xs font-semibold text-ink-2">
                  {it.codigo}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{it.nombre}</span>
                <button
                  type="button"
                  onClick={() => abrirEditar(it)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/60 transition-colors hover:bg-surface-2 hover:text-ink"
                  title="Editar"
                >
                  <EditIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(it)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/60 transition-colors hover:bg-red-50 hover:text-red-700"
                  title="Eliminar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editando && (
        <Modal className="animate-fade-in z-50 flex items-center justify-center bg-dark/70 p-4">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                {editando.id ? 'Editar' : 'Agregar'} {titulo.toLowerCase()}
              </h3>
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2/70 hover:bg-surface-2 hover:text-ink"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <p className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertIcon className="h-4 w-4 shrink-0" /> {error}
              </p>
            )}

            <div className="space-y-3">
              {campos.map((c) =>
                c.key === 'prenda' ? (
                  <label key={c.key} className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                      {c.label}
                    </span>
                    <select
                      value={editando.valores.prenda || ''}
                      onChange={(e) =>
                        setEditando({ ...editando, valores: { ...editando.valores, prenda: e.target.value } })
                      }
                      className={inputCls}
                    >
                      {(prendas || []).map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.value} · {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label key={c.key} className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-2">
                      {c.label}
                    </span>
                    <input
                      type="text"
                      value={editando.valores[c.key] ?? ''}
                      onChange={(e) =>
                        setEditando({ ...editando, valores: { ...editando.valores, [c.key]: e.target.value } })
                      }
                      placeholder={c.placeholder}
                      className={inputCls}
                      autoFocus={c.key === 'codigo'}
                    />
                  </label>
                ),
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(null)}
                disabled={guardando}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="flex-1 rounded-lg bg-ink py-2.5 text-sm font-medium text-white hover:bg-metal-2 disabled:opacity-40"
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}

export default function Codigos() {
  const [catalogo, setCatalogo] = useState('hombre')
  const [tab, setTab] = useState('marcas')
  const prendas = PRENDAS_POR_CATALOGO[catalogo] || []
  const [prenda, setPrenda] = useState(prendas[0]?.value || '')

  const { data: marcas = [], isLoading: cargandoMarcas } = useMarcas(catalogo)
  const { data: colores = [], isLoading: cargandoColores } = useColores(catalogo)
  const { data: estilos = [], isLoading: cargandoEstilos } = useEstilos(prenda, catalogo)

  const estilosFiltrados = useMemo(() => estilos.filter((e) => e.prenda === prenda), [estilos, prenda])

  function cambiarCatalogo(valor) {
    setCatalogo(valor)
    setPrenda((PRENDAS_POR_CATALOGO[valor] || [])[0]?.value || '')
  }

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Códigos</h1>
        <p className="mt-1 text-sm text-ink-2">
          Catálogo para armar el SKU de los productos: <span className="font-mono text-xs">PRENDA + MARCA + ESTILO + CALIDAD + COLOR</span> (todo pegado).
        </p>
      </div>

      {/* Catálogo: hombre / mujer (listados independientes) */}
      <div className="mb-4 inline-flex rounded-xl border border-line bg-white p-0.5">
        {CATALOGOS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => cambiarCatalogo(c.value)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all duration-200 ${
              catalogo === c.value ? 'bg-ink text-white shadow-sm' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Pestañas */}
      <div className="mb-4 inline-flex rounded-xl border border-line bg-white p-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all duration-200 ${
              tab === t.id ? 'bg-ink text-white shadow-sm' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'marcas' &&
        (cargandoMarcas ? (
          <div className="grid place-items-center py-20">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
          </div>
        ) : (
          <Seccion
            titulo="Marcas"
            descripcion={`${marcas.length} marcas en ${catalogo} (código de 2 dígitos).`}
            items={marcas}
            queryKey="marcas"
            catalogo={catalogo}
            api={{ create: codigosApi.createMarca, update: codigosApi.updateMarca, remove: codigosApi.deleteMarca }}
            campos={[
              { key: 'codigo', label: 'Código', placeholder: 'Ej. 06' },
              { key: 'nombre', label: 'Nombre', placeholder: 'Ej. Clemont' },
            ]}
          />
        ))}

      {tab === 'colores' &&
        (cargandoColores ? (
          <div className="grid place-items-center py-20">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
          </div>
        ) : (
          <Seccion
            titulo="Colores"
            descripcion={`${colores.length} colores en ${catalogo} (código de 2 dígitos).`}
            items={colores}
            queryKey="colores"
            catalogo={catalogo}
            api={{ create: codigosApi.createColor, update: codigosApi.updateColor, remove: codigosApi.deleteColor }}
            campos={[
              { key: 'codigo', label: 'Código', placeholder: 'Ej. 06' },
              { key: 'nombre', label: 'Nombre', placeholder: 'Ej. Negro' },
            ]}
          />
        ))}

      {tab === 'estilos' && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-2">Prenda</label>
            <select value={prenda} onChange={(e) => setPrenda(e.target.value)} className={`${inputCls} w-64`}>
              {prendas.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.value} · {p.label}
                </option>
              ))}
            </select>
          </div>
          {cargandoEstilos ? (
            <div className="grid place-items-center py-20">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-2/30 border-t-ink-2" />
            </div>
          ) : (
            <Seccion
              titulo="Estilos"
              descripcion={`${estilosFiltrados.length} estilos para ${prenda} (${catalogo}).`}
              items={estilosFiltrados}
              queryKey="estilos"
              prenda={prenda}
              prendas={prendas}
              catalogo={catalogo}
              api={{ create: codigosApi.createEstilo, update: codigosApi.updateEstilo, remove: codigosApi.deleteEstilo }}
              campos={[
                { key: 'prenda', label: 'Prenda' },
                { key: 'codigo', label: 'Código', placeholder: 'Ej. 01' },
                { key: 'nombre', label: 'Nombre', placeholder: 'Ej. Gorra BOSS clásica' },
              ]}
            />
          )}
        </>
      )}
    </div>
  )
}
