import { useMemo } from 'react'
import Seo from '../components/Seo'
import CatalogoResultados from '../components/CatalogoResultados'

// Página de Promociones: muestra los productos en oferta (precio_antes > precio).
// Los productos en oferta también siguen apareciendo en sus categorías.
export default function Promociones() {
  const parametros = useMemo(() => ({ en_oferta: true }), [])

  return (
    <>
      <Seo
        title="Ofertas exclusivas"
        description="Aprovecha las ofertas exclusivas de Praga Medellín: descuentos en camisetas, buzos, tenis, gorras y más. Envíos a todo Colombia."
        url="https://pragamedellin.com/promociones"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Ofertas exclusivas | Praga Medellín',
            description: 'Productos en oferta de Praga Medellín.',
            url: 'https://pragamedellin.com/promociones',
            mainEntity: { '@type': 'ItemList', itemListElement: [] },
          },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
            Ofertas exclusivas
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            Los mejores descuentos de la temporada. Se actualiza automáticamente.
          </p>
        </div>

        <CatalogoResultados parametros={parametros} />
      </div>
    </>
  )
}