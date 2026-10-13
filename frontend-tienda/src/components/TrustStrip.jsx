import { RefreshIcon, ShieldIcon, TruckIcon, WhatsAppIcon } from './icons'

// Información real de confianza y servicio de Praga Medellín.
const ITEMS = [
  { icon: ShieldIcon, titulo: 'Pago seguro', texto: 'Wompi: tarjeta de crédito o débito' },
  { icon: TruckIcon, titulo: 'Envíos a todo el país', texto: 'Recoge en sede o recíbelo en casa' },
  { icon: RefreshIcon, titulo: 'Cambios y devoluciones', texto: 'Disponibles en nuestras 4 sedes' },
  { icon: WhatsAppIcon, titulo: 'Atención al cliente', texto: 'Escríbenos por WhatsApp' },
]

export default function TrustStrip() {
  return (
    <section className="border-y border-line bg-surface-2">
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-6 py-8 lg:grid-cols-4">
        {ITEMS.map((Item, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
              <Item.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{Item.titulo}</p>
              <p className="mt-0.5 text-xs text-ink-2">{Item.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}