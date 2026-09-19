// Datos simulados con la MISMA forma que expondrá el backend real (Laravel).
// Cuando el backend exista, estos datos solo se usan con VITE_USE_MOCK=true.
//
// La jerarquía del catálogo (categorías > subcategorías > tallas/variantes) debe
// vivir como datos semilla en la base de datos real. Aquí se replica como seed.

export const sedes = [
  { id: 1, nombre: 'Praga Medellín - Aranjuez', direccion: 'Calle 78 # 54-20, Aranjuez' },
  { id: 2, nombre: 'Praga Woman', direccion: 'Carrera 65 # 45-30, Prado Centro' },
  { id: 3, nombre: 'Praga Medellín - Andalucía', direccion: 'Carrera 65 # 73-45, Andalucía' },
  { id: 4, nombre: 'Akron Store', direccion: 'Calle 30 # 35-10, Buenos Aires' },
]

// Vendedores de las 4 sedes. No inician sesión: el panel usa una cuenta única
// y el vendedor se elige al facturar en el POS.
export const empleados = [
  { id: 1, nombre: 'Michael', sede_id: 1, rol: 'cajero' },
  { id: 2, nombre: 'María Fernanda', sede_id: 2, rol: 'cajero' },
  { id: 3, nombre: 'Liseth', sede_id: 3, rol: 'cajero' },
  { id: 4, nombre: 'Bibiana', sede_id: 3, rol: 'cajero' },
  { id: 5, nombre: 'Sara', sede_id: 4, rol: 'cajero' },
]

// ---------------------------------------------------------------------------
// Catálogo real de Praga Medellín (seed).
// Las tallas van en la subcategoría; si la categoría no tiene subcategorías
// (Jeans, Mochos, Pantalonetas) van directo en la categoría. Las categorías
// con `tallas: []` o sin tallas (Bolsos, Gorras, Perfumes) son talla única.
// ---------------------------------------------------------------------------

const TALLAS_ROPA = ['S', 'M', 'L', 'XL', 'XXL']
const TALLAS_TENIS = ['7-40', '8-41', '9-42', '10-43', '11-44']
const TALLAS_CHANCLAS = ['6-39', '7-40', '8-41', '9-42', '10-43', '11-44']

export const categorias = [
  { id: 1, nombre: 'Bolsos', catalogo: 'hombre' },
  { id: 2, nombre: 'Buzos', catalogo: 'hombre' },
  { id: 3, nombre: 'Camisetas', catalogo: 'hombre' },
  { id: 4, nombre: 'Chanclas', catalogo: 'hombre' },
  { id: 5, nombre: 'Conjuntos', catalogo: 'hombre' },
  { id: 6, nombre: 'Gorras', catalogo: 'hombre' },
  { id: 7, nombre: 'Jeans', tallas: ['30', '32', '34', '36', '38'], catalogo: 'hombre' },
  { id: 8, nombre: 'Mochos', tallas: ['28', '30', '32', '34', '36', '38'], catalogo: 'hombre' },
  { id: 9, nombre: 'Pantalonetas', tallas: ['L', 'M', 'XL', 'XXL'], catalogo: 'hombre' },
  { id: 10, nombre: 'Perfumes', catalogo: 'hombre' },
  { id: 11, nombre: 'Sudaderas', catalogo: 'hombre' },
  { id: 12, nombre: 'Tenis', catalogo: 'hombre' },

  // Catálogo Mujer
  { id: 13, nombre: 'Blusas', tallas: ['XS/S', 'S/M', 'M/L'], catalogo: 'mujer' },
  { id: 14, nombre: 'Blusones cortos', tallas: ['S', 'M', 'L'], catalogo: 'mujer' },
  { id: 15, nombre: 'Blusones', tallas: ['S', 'M', 'L'], catalogo: 'mujer' },
  { id: 16, nombre: 'Bodys', tallas: ['S/M', 'M/L', 'Talla única'], catalogo: 'mujer' },
  { id: 17, nombre: 'Bolsos', catalogo: 'mujer' },
  { id: 18, nombre: 'Chanclas', tallas: ['5', '6', '7', '8'], catalogo: 'mujer' },
  { id: 19, nombre: 'Conjuntos', tallas: ['S', 'M', 'L'], catalogo: 'mujer' },
  { id: 20, nombre: 'Sets', tallas: ['XS', 'S', 'M', 'Talla única'], catalogo: 'mujer' },
  { id: 21, nombre: 'Faldas', tallas: ['XS', 'S', 'M', 'L', 'XL'], catalogo: 'mujer' },
  { id: 22, nombre: 'Jeans', tallas: ['01-6', '03-8', '05-10', '07-12', '09-14', '11-16'], catalogo: 'mujer' },
  { id: 23, nombre: 'Perfumes', catalogo: 'mujer' },
  { id: 24, nombre: 'Relojes', catalogo: 'mujer' },
  { id: 25, nombre: 'Chaquetas', tallas: ['L', 'XL'], catalogo: 'mujer' },
  { id: 26, nombre: 'Shorts', tallas: ['XS', 'S', 'M'], catalogo: 'mujer' },
  { id: 27, nombre: 'Vestidos', tallas: ['S', 'M', 'L'], catalogo: 'mujer' },
  { id: 28, nombre: 'Tenis', catalogo: 'mujer' },
]

export const subcategorias = [
  { id: 1, categoria_id: 1, nombre: 'Bolsos Premium 1.1', tallas: [] },
  { id: 2, categoria_id: 1, nombre: 'Bolsos Turcos', tallas: [] },
  { id: 3, categoria_id: 2, nombre: 'Buzos Premium 1.1', tallas: TALLAS_ROPA },
  { id: 4, categoria_id: 2, nombre: 'Buzos Turcos', tallas: TALLAS_ROPA },
  { id: 5, categoria_id: 3, nombre: 'Camisetas Originales', tallas: TALLAS_ROPA },
  { id: 6, categoria_id: 3, nombre: 'Camisetas Premium 1.1', tallas: TALLAS_ROPA },
  { id: 7, categoria_id: 3, nombre: 'Camisetas Turcas', tallas: TALLAS_ROPA },
  { id: 8, categoria_id: 4, nombre: 'Chanclas Premium 1.1', tallas: TALLAS_CHANCLAS },
  { id: 9, categoria_id: 4, nombre: 'Chanclas Turcas', tallas: TALLAS_CHANCLAS },
  { id: 10, categoria_id: 5, nombre: 'Conjuntos Premium 1.1', tallas: TALLAS_ROPA },
  { id: 11, categoria_id: 5, nombre: 'Conjuntos Turcos', tallas: TALLAS_ROPA },
  { id: 12, categoria_id: 6, nombre: 'Gorras Originales', tallas: [] },
  { id: 13, categoria_id: 6, nombre: 'Gorras Premium 1.1', tallas: [] },
  { id: 14, categoria_id: 6, nombre: 'Gorras Turcas', tallas: [] },
  { id: 15, categoria_id: 10, nombre: 'Perfumes Originales', tallas: [] },
  { id: 16, categoria_id: 10, nombre: 'Perfumes Premium 1.1', tallas: [] },
  { id: 17, categoria_id: 11, nombre: 'Sudaderas Premium 1.1', tallas: TALLAS_ROPA },
  { id: 18, categoria_id: 12, nombre: 'Tenis Originales', tallas: TALLAS_TENIS },
  { id: 19, categoria_id: 12, nombre: 'Tenis Premium 1.1', tallas: TALLAS_TENIS },
  { id: 20, categoria_id: 12, nombre: 'Tenis Turcos', tallas: TALLAS_TENIS },

  // Catálogo Mujer
  { id: 21, categoria_id: 23, nombre: 'Perfumes Calidad 1.1', tallas: [] },
  { id: 22, categoria_id: 28, nombre: 'Tenis Calidad 1.1', tallas: ['5', '6', '7', '8'] },
  { id: 23, categoria_id: 28, nombre: 'Tenis Calidad Turca', tallas: ['5', '6', '7'] },
  { id: 24, categoria_id: 28, nombre: 'Tenis Originales', tallas: ['5', '6', '7'] },
]

// Tallas válidas para una combinación categoría+subcategoría.
// Regla: si hay subcategoría usa sus tallas; si no, las de la categoría.
export function tallasPara(categoriaId, subcategoriaId) {
  if (subcategoriaId) {
    const s = subcategorias.find((x) => x.id === Number(subcategoriaId))
    if (s) return s.tallas
  }
  const c = categorias.find((x) => x.id === Number(categoriaId))
  return c ? c.tallas || [] : []
}

// Productos base (la variante es producto + talla). Precios de referencia.
export const productos = [
  { id: 1, nombre: 'Buzo Premium 1.1 Negro', descripcion: 'Buzo premium con estampado 1.1', precio: 159000, sku: 'BUZ-P11-01', categoria_id: 2, subcategoria_id: 3, imagen_url: '/images/products/chaqueta.svg' },
  { id: 2, nombre: 'Buzo Turco Gris', descripcion: 'Buzo turco de tela suave', precio: 129000, sku: 'BUZ-TUR-01', categoria_id: 2, subcategoria_id: 4, imagen_url: '/images/products/chaqueta.svg' },
  { id: 3, nombre: 'Camiseta Original Negra', descripcion: 'Camiseta básica de algodón', precio: 85000, sku: 'CAM-ORI-01', categoria_id: 3, subcategoria_id: 5, imagen_url: '/images/products/camiseta.svg' },
  { id: 4, nombre: 'Camiseta Premium 1.1 Boxeada', descripcion: 'Manga boxeada edición 1.1', precio: 99000, sku: 'CAM-P11-01', categoria_id: 3, subcategoria_id: 6, imagen_url: '/images/products/camiseta.svg' },
  { id: 5, nombre: 'Camiseta Turca Básica', descripcion: 'Camiseta turca de corte clásico', precio: 75000, sku: 'CAM-TUR-01', categoria_id: 3, subcategoria_id: 7, imagen_url: '/images/products/camiseta.svg' },
  { id: 6, nombre: 'Chancla Premium 1.1', descripcion: 'Chancla premium con logo 1.1', precio: 45000, sku: 'CHA-P11-01', categoria_id: 4, subcategoria_id: 8, imagen_url: '/images/products/accesorio.svg' },
  { id: 7, nombre: 'Conjunto Premium 1.1', descripcion: 'Conjunto dos piezas premium', precio: 219000, sku: 'CON-P11-01', categoria_id: 5, subcategoria_id: 10, imagen_url: '/images/products/chaqueta.svg' },
  { id: 8, nombre: 'Gorra Original Negra', descripcion: 'Gorra negra con bordado', precio: 60000, sku: 'GOR-ORI-01', categoria_id: 6, subcategoria_id: 12, imagen_url: '/images/products/accesorio.svg' },
  { id: 9, nombre: 'Jean Cargo Negro', descripcion: 'Jean cargo de corte recto', precio: 139000, sku: 'JEA-CAR-01', categoria_id: 7, subcategoria_id: null, imagen_url: '/images/products/pantalon.svg' },
  { id: 10, nombre: 'Mocho Pata de Gallo', descripcion: 'Pantalón mocho pata de gallo', precio: 149000, sku: 'MOC-PDG-01', categoria_id: 8, subcategoria_id: null, imagen_url: '/images/products/pantalon.svg' },
  { id: 11, nombre: 'Pantaloneta Deportiva', descripcion: 'Pantaloneta corta deportiva', precio: 95000, sku: 'PAN-DEP-01', categoria_id: 9, subcategoria_id: null, imagen_url: '/images/products/pantalon.svg' },
  { id: 12, nombre: 'Perfume Original 1.1', descripcion: 'Perfume edición original', precio: 159000, sku: 'PER-ORI-01', categoria_id: 10, subcategoria_id: 15, imagen_url: '/images/products/accesorio.svg' },
  { id: 13, nombre: 'Sudadera Premium 1.1', descripcion: 'Sudadera con capucha premium', precio: 169000, sku: 'SUD-P11-01', categoria_id: 11, subcategoria_id: 17, imagen_url: '/images/products/chaqueta.svg' },
  { id: 14, nombre: 'Tenis Original Blanco', descripcion: 'Tenis blanco corte original', precio: 189000, sku: 'TEN-ORI-01', categoria_id: 12, subcategoria_id: 18, imagen_url: '/images/products/chaqueta.svg' },
  { id: 15, nombre: 'Bolso Premium 1.1', descripcion: 'Bolso premium con logo', precio: 120000, sku: 'BOL-P11-01', categoria_id: 1, subcategoria_id: 1, imagen_url: '/images/products/accesorio.svg' },
  { id: 16, nombre: 'Blusa Seda', descripcion: 'Blusa de seda para mujer', precio: 65000, sku: 'BLU-SED-01', categoria_id: 13, subcategoria_id: null, imagen_url: '/images/products/camiseta.svg' },
  { id: 17, nombre: 'Jeans Mujer', descripcion: 'Jeans de mujer', precio: 129000, sku: 'JEA-MUJ-01', categoria_id: 22, subcategoria_id: null, imagen_url: '/images/products/pantalon.svg' },
  { id: 18, nombre: 'Vestido Elegante', descripcion: 'Vestido elegante', precio: 149000, sku: 'VES-ELE-01', categoria_id: 27, subcategoria_id: null, imagen_url: '/images/products/camiseta.svg' },
]

// Variantes: producto + talla (null = talla única). Cada variante tiene su
// propio código de barras ÚNICO (unidad exacta de control de inventario).
export const variantes = []
let _varianteId = 1
let _barra = 770100000000
productos.forEach((p) => {
  const tallas = tallasPara(p.categoria_id, p.subcategoria_id)
  if (tallas.length === 0) {
    variantes.push({ id: _varianteId++, producto_id: p.id, talla: null, codigo_barras: String(++_barra) })
  } else {
    tallas.forEach((t) => {
      variantes.push({ id: _varianteId++, producto_id: p.id, talla: t, codigo_barras: String(++_barra) })
    })
  }
})

// Inventario por VARIANTE y por sede. Se genera con una semilla fija para que
// la demo sea estable (cada carga muestra los mismos stocks).
let _seedInv = 20260913
function _randInv() {
  _seedInv = (_seedInv * 9301 + 49297) % 233280
  return _seedInv / 233280
}
export const inventario = []
variantes.forEach((v) => {
  sedes.forEach((s) => {
    // Algunas variantes quedan en 0 para probar el flujo de stock en el POS
    const cantidad = _randInv() < 0.18 ? 0 : Math.floor(_randInv() * 12) + 1
    inventario.push({ variante_id: v.id, sede_id: s.id, cantidad })
  })
})

// ---------------------------------------------------------------------------
// Ventas simuladas de los últimos 30 días (deterministas: misma seed por carga).
// ---------------------------------------------------------------------------

let _seed = 20260913
function _rand() {
  _seed = (_seed * 9301 + 49297) % 233280
  return _seed / 233280
}
function _randInt(min, max) {
  return min + Math.floor(_rand() * (max - min + 1))
}
function _pick(arr) {
  return arr[Math.floor(_rand() * arr.length)]
}

export const ventas = []
export const detalleVentas = []
export const facturas = []

let _ventaId = 1
let _facturaNum = 1000

for (let offset = 29; offset >= 0; offset -= 1) {
  const fecha = new Date()
  fecha.setHours(_randInt(9, 20), _randInt(0, 59), 0, 0)
  fecha.setDate(fecha.getDate() - offset)

  const esFinSemana = [0, 6].includes(fecha.getDay())
  const base = offset === 0 ? 4 : esFinSemana ? 3 : 2
  const numVentas = base + _randInt(0, 2)

  for (let i = 0; i < numVentas; i += 1) {
    const empleado = _pick(empleados)
    const sedeVenta = _rand() < 0.8 ? empleado.sede_id : _randInt(1, 4)

    const numItems = _randInt(1, 3)
    const items = []
    for (let j = 0; j < numItems; j += 1) {
      const variante = _pick(variantes)
      const producto = productos.find((p) => p.id === variante.producto_id)
      const cantidad = _randInt(1, 2)
      items.push({ variante_id: variante.id, cantidad, precio_unitario: producto.precio })
    }
    const total = items.reduce((sum, it) => sum + it.cantidad * it.precio_unitario, 0)

    const venta = {
      id: _ventaId,
      empleado_id: empleado.id,
      sede_venta_id: sedeVenta,
      tipo: _rand() < 0.9 ? 'presencial' : 'virtual',
      fecha: fecha.toISOString(),
      total,
    }
    ventas.push(venta)
    items.forEach((it) =>
      detalleVentas.push({
        venta_id: venta.id,
        variante_id: it.variante_id,
        sede_stock_id: sedeVenta,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
      }),
    )
    facturas.push({
      venta_id: venta.id,
      numero_interno: `FAC-${String(++_facturaNum).padStart(4, '0')}`,
      fecha: venta.fecha,
    })
    _ventaId += 1
  }
}

// ---------------------------------------------------------------------------
// Devoluciones (cambios en punto físico). Empiezan vacías y crecen durante la
// sesión con crearDevolucion() del mock.
// ---------------------------------------------------------------------------

export const devoluciones = []
export const detalleDevoluciones = []
