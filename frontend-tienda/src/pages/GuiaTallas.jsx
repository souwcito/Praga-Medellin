import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import { GUIA_TALLAS_TENIS } from '../data/guiaTallas'
import { ArrowRightIcon, WhatsAppIcon } from '../components/icons'

const COLUMNAS = [
  { clave: 'co', titulo: 'CO' },
  { clave: 'us', titulo: 'USA' },
  { clave: 'eur', titulo: 'EUR' },
  { clave: 'cm', titulo: 'CM' },
]

const WHATSAPP =
  'https://wa.me/573216573427?text=Hola%2C%20necesito%20ayuda%20con%20la%20gu%C3%ADa%20de%20tallas%20de%20tenis%20y%20chanclas'

const FAQ = [
  {
    pregunta: '¿Cómo sé mi talla de tenis o chanclas en Praga Medellín?',
    respuesta:
      'En la tienda las tallas de tenis y chanclas se muestran en USA (US). Compara tu talla habitual con la tabla de equivalencias de Colombia (CO), Europa (EUR) y centímetros (CM).',
  },
  {
    pregunta: '¿Qué hago si estoy entre dos tallas?',
    respuesta:
      'Si estás entre dos tallas, elige la mayor. También puedes escribirnos por WhatsApp para ayudarte a elegir según el modelo.',
  },
]

export default function GuiaTallas() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Guía de tallas de tenis y chanclas | Praga Medellín',
      description:
        'Tabla de equivalencias de tallas de tenis y chanclas en USA, Colombia, Europa y centímetros. Praga Medellín.',
      url: 'https://pragamedellin.com/guia-tallas',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.pregunta,
        acceptedAnswer: { '@type': 'Answer', text: item.respuesta },
      })),
    },
  ]

  return (
    <>
      <Seo
        title="Guía de tallas de tenis y chanclas"
        description="Tabla de equivalencias de tallas de tenis y chanclas: USA, Colombia, Europa y centímetros. Encuentra tu talla en Praga Medellín."
        url="https://pragamedellin.com/guia-tallas"
        jsonLd={jsonLd}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-line bg-surface-2/40 px-6 py-8 sm:px-10 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-2">
            Tenis y chanclas
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight text-ink sm:text-5xl">
            Guía de tallas
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-base">
            En la tienda las tallas de tenis y chanclas se muestran en <b>USA (US)</b>. Usa esta
            tabla para comparar con Colombia (CO), Europa (EUR) y centímetros (CM).
            Si estás entre dos tallas, elige la mayor.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {GUIA_TALLAS_TENIS.map((seccion) => (
            <section
              key={seccion.id}
              className="overflow-hidden rounded-2xl border border-line bg-white"
            >
              <div className="border-b border-line bg-surface-2/60 px-5 py-4">
                <h2 className="font-display text-xl font-semibold text-ink">
                  {seccion.titulo}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-2/70 text-[10px] uppercase tracking-wide text-ink-2">
                      {COLUMNAS.map((columna) => (
                        <th
                          key={columna.clave}
                          scope="col"
                          className="px-3 py-2.5 text-center font-semibold"
                        >
                          {columna.titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seccion.filas.map((fila, indice) => (
                      <tr key={`${seccion.id}-${indice}`} className="border-t border-line/70">
                        {COLUMNAS.map((columna) => (
                          <td
                            key={columna.clave}
                            className="px-3 py-2.5 text-center text-ink-2"
                          >
                            {fila[columna.clave]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 grid gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              ¿Cómo medir tu pie?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Apoya el pie sobre una hoja, marca el punto más largo del dedo y mide
              desde el talón hasta esa marca. Compara los centímetros con la tabla.
              Las medidas son de referencia y pueden variar según el modelo.
            </p>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              ¿Necesitas ayuda?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Escríbenos por WhatsApp y te ayudamos a elegir la talla correcta. Esta
              misma guía es la que usa nuestro chatbot para responder.
            </p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#1ebe5b] active:scale-95"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Preguntar por WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2/40 px-5 py-4">
          <p className="text-sm font-medium text-ink">
            ¿Ya sabes tu talla? Mira los tenis y chanclas disponibles.
          </p>
          <Link
            to="/catalogo/hombre"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-metal-2 active:scale-95"
          >
            Ver catálogo
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 space-y-4">
          {FAQ.map((item) => (
            <details
              key={item.pregunta}
              className="rounded-xl border border-line bg-white px-4 py-3"
            >
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                {item.pregunta}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{item.respuesta}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  )
}

