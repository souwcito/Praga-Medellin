// Placeholder genérico para pantallas que se construyen más adelante.
export default function PlaceholderPage({ title, description }) {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-sm text-ink-2">
        {description || `Próximamente: ${title}.`}
      </p>
      <div className="mt-6 grid h-64 place-items-center rounded-2xl border border-dashed border-line text-sm text-ink-2/70">
        En construcción…
      </div>
    </div>
  )
}