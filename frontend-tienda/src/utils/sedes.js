// Sedes de Praga Medellín con sus direcciones (enlace a Google Maps).
export const sedes = [
  { nombre: 'Praga Medellín · Andalucía', direccion: 'Calle 107 # 47-27' },
  { nombre: 'Praga Medellín · Aranjuez', direccion: 'Cra 49 A # 92-24' },
  { nombre: 'Akron Store Castilla', direccion: 'Cra 68 # 93-24' },
  { nombre: 'Praga Woman Castilla', direccion: 'Calle 92B # 66 A 47' },
]

// Enlace para abrir la dirección en Google Maps.
export const mapsLink = (direccion) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${direccion}, Medellín, Colombia`,
  )}`