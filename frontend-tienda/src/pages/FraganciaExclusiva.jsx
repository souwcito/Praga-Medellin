import { useMemo } from 'react'
import Seo from '../components/Seo'
import CatalogoResultados from '../components/CatalogoResultados'

// Página dedicada "Fragancia Exclusiva de Praga": muestra los productos del
// catálogo 'fragancia' (se agregan desde el panel eligiendo "Catálogo Fragancias").
export default function FraganciaExclusiva() {
  const parametros = useMemo(() => ({ catalogo: 'fragancia' }), [])

  return (
    <>
      <Seo
        title="Fragancia Exclusiva de Praga"
        description="Fragancia Exclusiva de Praga: una firma única pensada para quienes viven Praga. Disponible en las 4 sedes y envíos a todo Colombia."
        url="https://pragamedellin.com/fragancia-exclusiva"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Fragancia Exclusiva de Praga',
            description: 'Fragancia exclusiva de la marca Praga Medellín.',
            url: 'https://pragamedellin.com/fragancia-exclusiva',
            mainEntity: { '@type': 'ItemList', itemListElement: [] },
          },
        ]}
      />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-line bg-dark py-14 text-white sm:py-20">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
            Exclusiva de Praga
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
            Fragancia Exclusiva de Praga
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/60">
            Una firma única, creada para los que viven Praga.
          </p>
        </div>
      </div>

      {/* Productos del catálogo fragancia */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <CatalogoResultados
          parametros={parametros}
          emptyMessage="Nuestra fragancia exclusiva ya viene en camino. Muy pronto la tendrás aquí."
        />
      </div>
    </>
  )
}