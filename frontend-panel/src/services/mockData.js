// Datos simulados con la MISMA forma que expondrá el backend real (Laravel).
// Cuando el backend exista, estos datos solo se usan con VITE_USE_MOCK=true.

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

export const categorias = [
  { id: 1, nombre: 'Camisetas' },
  { id: 2, nombre: 'Pantalones' },
  { id: 3, nombre: 'Chaquetas' },
  { id: 4, nombre: 'Accesorios' },
]

export const subcategorias = [
  { id: 1, categoria_id: 1, nombre: 'Original' },
  { id: 2, categoria_id: 1, nombre: '1.1' },
  { id: 3, categoria_id: 2, nombre: 'Slim' },
  { id: 4, categoria_id: 2, nombre: 'Regular' },
  { id: 5, categoria_id: 3, nombre: 'Rompevientos' },
  { id: 6, categoria_id: 3, nombre: 'Canguro' },
  { id: 7, categoria_id: 4, nombre: 'Gorras' },
  { id: 8, categoria_id: 4, nombre: 'Medias' },
]

export const productos = [
  { id: 1, nombre: 'Camiseta Original Negra', descripcion: 'Camiseta básica de algodón, corte clásico', precio: 89000, sku: 'CAM-001', codigo_barras: '770100000001', categoria_id: 1, subcategoria_id: 1, imagen_url: '/images/products/camiseta.svg' },
  { id: 2, nombre: 'Camiseta Original Blanca', descripcion: 'Camiseta básica de algodón, corte clásico', precio: 89000, sku: 'CAM-002', codigo_barras: '770100000002', categoria_id: 1, subcategoria_id: 1, imagen_url: '/images/products/camiseta.svg' },
  { id: 3, nombre: 'Camiseta 1.1 Oversize Gris', descripcion: 'Camiseta oversize con estampado 1.1', precio: 95000, sku: 'CAM-003', codigo_barras: '770100000003', categoria_id: 1, subcategoria_id: 2, imagen_url: '/images/products/camiseta.svg' },
  { id: 4, nombre: 'Camiseta 1.1 Boxeada Azul', descripcion: 'Camiseta de manga corta boxeada, edición 1.1', precio: 98000, sku: 'CAM-004', codigo_barras: '770100000004', categoria_id: 1, subcategoria_id: 2, imagen_url: '/images/products/camiseta.svg' },
  { id: 5, nombre: 'Pantalón Cargo Slim Verde Oliva', descripcion: 'Pantalón cargo de corte slim con bolsillos laterales', precio: 149000, sku: 'PAN-001', codigo_barras: '770100000005', categoria_id: 2, subcategoria_id: 3, imagen_url: '/images/products/pantalon.svg' },
  { id: 6, nombre: 'Pantalón Regular Beige', descripcion: 'Pantalón de corte regular, tela de mezclilla', precio: 135000, sku: 'PAN-002', codigo_barras: '770100000006', categoria_id: 2, subcategoria_id: 4, imagen_url: '/images/products/pantalon.svg' },
  { id: 7, nombre: 'Rompevientos Reflectivo', descripcion: 'Chaqueta rompevientos con detalles reflectivos', precio: 220000, sku: 'CHA-001', codigo_barras: '770100000007', categoria_id: 3, subcategoria_id: 5, imagen_url: '/images/products/chaqueta.svg' },
  { id: 8, nombre: 'Canguro Negro', descripcion: 'Sudadera canguro con capucha, unisex', precio: 180000, sku: 'CHA-002', codigo_barras: '770100000008', categoria_id: 3, subcategoria_id: 6, imagen_url: '/images/products/chaqueta.svg' },
  { id: 9, nombre: 'Gorra Negra Bordada', descripcion: 'Gorra negra con bordado frontal', precio: 69000, sku: 'ACC-001', codigo_barras: '770100000009', categoria_id: 4, subcategoria_id: 7, imagen_url: '/images/products/accesorio.svg' },
  { id: 10, nombre: 'Medias 3 Pack', descripcion: 'Paquete de 3 medias tobilleras', precio: 39000, sku: 'ACC-002', codigo_barras: '770100000010', categoria_id: 4, subcategoria_id: 8, imagen_url: '/images/products/accesorio.svg' },
]

// Inventario por sede: producto_id + sede_id + cantidad.
// Se dejan algunos productos en 0 en algunas sedes para probar el filtro por stock.
export const inventario = [
  { producto_id: 1, sede_id: 1, cantidad: 12 },
  { producto_id: 1, sede_id: 2, cantidad: 6 },
  { producto_id: 1, sede_id: 3, cantidad: 9 },
  { producto_id: 1, sede_id: 4, cantidad: 0 },
  { producto_id: 2, sede_id: 1, cantidad: 8 },
  { producto_id: 2, sede_id: 2, cantidad: 0 },
  { producto_id: 2, sede_id: 3, cantidad: 5 },
  { producto_id: 2, sede_id: 4, cantidad: 7 },
  { producto_id: 3, sede_id: 1, cantidad: 4 },
  { producto_id: 3, sede_id: 2, cantidad: 10 },
  { producto_id: 3, sede_id: 3, cantidad: 0 },
  { producto_id: 3, sede_id: 4, cantidad: 3 },
  { producto_id: 4, sede_id: 1, cantidad: 0 },
  { producto_id: 4, sede_id: 2, cantidad: 2 },
  { producto_id: 4, sede_id: 3, cantidad: 6 },
  { producto_id: 4, sede_id: 4, cantidad: 11 },
  { producto_id: 5, sede_id: 1, cantidad: 7 },
  { producto_id: 5, sede_id: 2, cantidad: 0 },
  { producto_id: 5, sede_id: 3, cantidad: 4 },
  { producto_id: 5, sede_id: 4, cantidad: 5 },
  { producto_id: 6, sede_id: 1, cantidad: 3 },
  { producto_id: 6, sede_id: 2, cantidad: 8 },
  { producto_id: 6, sede_id: 3, cantidad: 2 },
  { producto_id: 6, sede_id: 4, cantidad: 0 },
  { producto_id: 7, sede_id: 1, cantidad: 5 },
  { producto_id: 7, sede_id: 2, cantidad: 4 },
  { producto_id: 7, sede_id: 3, cantidad: 3 },
  { producto_id: 7, sede_id: 4, cantidad: 2 },
  { producto_id: 8, sede_id: 1, cantidad: 9 },
  { producto_id: 8, sede_id: 2, cantidad: 0 },
  { producto_id: 8, sede_id: 3, cantidad: 1 },
  { producto_id: 8, sede_id: 4, cantidad: 6 },
  { producto_id: 9, sede_id: 1, cantidad: 14 },
  { producto_id: 9, sede_id: 2, cantidad: 5 },
  { producto_id: 9, sede_id: 3, cantidad: 7 },
  { producto_id: 9, sede_id: 4, cantidad: 9 },
  { producto_id: 10, sede_id: 1, cantidad: 20 },
  { producto_id: 10, sede_id: 2, cantidad: 12 },
  { producto_id: 10, sede_id: 3, cantidad: 15 },
  { producto_id: 10, sede_id: 4, cantidad: 18 },
]