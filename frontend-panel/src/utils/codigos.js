// Calcula el siguiente código numérico a partir de los códigos existentes.
// Ej: ['01','02','58'] -> '59' · ['98','99'] -> '100'.
// Mantiene al menos 2 dígitos (01, 02, …).
export function siguienteCodigo(codigos) {
  const nums = (codigos || [])
    .map((c) => parseInt(String(c).replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n))

  const max = nums.length ? Math.max(...nums) : 0
  const next = max + 1
  return next < 10 ? `0${next}` : String(next)
}
