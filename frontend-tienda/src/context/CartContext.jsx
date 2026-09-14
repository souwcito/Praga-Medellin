import { useCallback, useEffect, useMemo, useState } from 'react'
import { CartContext } from './cartContext'

// Carrito global con persistencia en localStorage (dura toda la sesión).
const STORAGE_KEY = 'praga_carrito'

function leerCarrito() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(leerCarrito)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // Agrega un producto+talla al carrito (respeta el stock disponible).
  const agregar = useCallback((producto, variante, cantidad = 1) => {
    setItems((prev) => {
      const existente = prev.find(
        (i) => i.producto_id === producto.id && i.talla === (variante.talla || null),
      )
      if (existente) {
        if (existente.cantidad >= variante.stock) return prev
        return prev.map((i) =>
          i.producto_id === producto.id && i.talla === (variante.talla || null)
            ? { ...i, cantidad: i.cantidad + cantidad }
            : i,
        )
      }
      return [
        ...prev,
        {
          key: `${producto.id}-${variante.talla || 'unica'}`,
          producto_id: producto.id,
          nombre: producto.nombre,
          talla: variante.talla,
          precio: producto.precio,
          imagen_url: producto.imagen_url,
          stock: variante.stock,
          cantidad,
        },
      ]
    })
  }, [])

  const cambiarCantidad = useCallback((key, cantidad) => {
    setItems((prev) =>
      prev.map((i) =>
        i.key === key ? { ...i, cantidad: Math.max(1, Math.min(i.stock, cantidad)) } : i,
      ),
    )
  }, [])

  const quitar = useCallback((key) => {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }, [])

  const vaciar = useCallback(() => setItems([]), [])

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.precio * i.cantidad, 0),
    [items],
  )
  const count = useMemo(() => items.reduce((sum, i) => sum + i.cantidad, 0), [items])

  const value = useMemo(
    () => ({ items, agregar, cambiarCantidad, quitar, vaciar, total, count }),
    [items, agregar, cambiarCantidad, quitar, vaciar, total, count],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}