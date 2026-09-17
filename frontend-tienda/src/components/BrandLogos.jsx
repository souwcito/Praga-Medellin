import logoAkron from '../assets/logo-akron.png'
import logoPraga from '../assets/logo-praga.png'
import logoWoman from '../assets/logo-praga-woman.png'

// Los 3 logos de la marca juntos: Akron, Praga (centro, más grande) y Praga Woman.
// `ring` define el anillo del borde (claro en fondos oscuros, línea en fondos blancos).
// `header` agranda mucho los logos en escritorio sin crecer la altura del header.
export default function BrandLogos({ big = false, header = false, ring = 'ring-line' }) {
  const lado = big
    ? 'h-12 w-12'
    : header
      ? 'h-9 w-9 md:h-14 md:w-14'
      : 'h-9 w-9'
  const centro = big
    ? 'h-16 w-16'
    : header
      ? 'h-11 w-11 md:h-[4.5rem] md:w-[4.5rem]'
      : 'h-11 w-11'
  const izq = header ? '-mr-2 md:-mr-4' : '-mr-2'
  const der = header ? '-ml-2 md:-ml-4' : '-ml-2'
  return (
    <div className="flex items-center" aria-label="Praga Medellín · Akron · Praga Woman">
      <img
        src={logoAkron}
        alt="Akron"
        className={`${lado} z-0 ${izq} rounded-full object-cover ring-2 ${ring}`}
      />
      <img
        src={logoPraga}
        alt="Praga Medellín"
        className={`${centro} z-10 rounded-full object-cover ring-2 ${ring}`}
      />
      <img
        src={logoWoman}
        alt="Praga Woman"
        className={`${lado} z-0 ${der} rounded-full object-cover ring-2 ${ring}`}
      />
    </div>
  )
}