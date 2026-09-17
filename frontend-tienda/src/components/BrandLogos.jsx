import logoAkron from '../assets/logo-akron.png'
import logoPraga from '../assets/logo-praga.png'
import logoWoman from '../assets/logo-praga-woman.png'

// Los 3 logos de la marca juntos: Akron, Praga (centro, más grande) y Praga Woman.
// `ring` define el anillo del borde (claro en fondos oscuros, línea en fondos blancos).
export default function BrandLogos({ big = false, ring = 'ring-line' }) {
  const lado = big ? 'h-12 w-12' : 'h-9 w-9'
  const centro = big ? 'h-16 w-16' : 'h-11 w-11'
  return (
    <div className="flex items-center" aria-label="Praga Medellín · Akron · Praga Woman">
      <img
        src={logoAkron}
        alt="Akron"
        className={`${lado} z-0 -mr-2 rounded-full object-cover ring-2 ${ring}`}
      />
      <img
        src={logoPraga}
        alt="Praga Medellín"
        className={`${centro} z-10 rounded-full object-cover ring-2 ${ring}`}
      />
      <img
        src={logoWoman}
        alt="Praga Woman"
        className={`${lado} z-0 -ml-2 rounded-full object-cover ring-2 ${ring}`}
      />
    </div>
  )
}