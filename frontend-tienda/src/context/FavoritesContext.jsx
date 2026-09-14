import { useCallback, useEffect, useMemo, useState } from 'react'
import { FavoritesContext } from './favoritesContext'

// Favoritos del cliente, persistidos en localStorage (guardan el producto).
const STORAGE_KEY = 'praga_favoritos'

function leerFavoritos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export function FavoritesProvider({ children }) {
  const [favoritos, setFavoritos] = useState(leerFavoritos)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritos))
  }, [favoritos])

  const esFavorito = useCallback(
    (id) => favoritos.some((f) => f.id === Number(id)),
    [favoritos],
  )

  const toggle = useCallback((producto) => {
    setFavoritos((prev) =>
      prev.some((f) => f.id === producto.id)
        ? prev.filter((f) => f.id !== producto.id)
        : [...prev, producto],
    )
  }, [])

  const quitar = useCallback(
    (id) => setFavoritos((prev) => prev.filter((f) => f.id !== Number(id))),
    [],
  )

  const value = useMemo(
    () => ({ favoritos, esFavorito, toggle, quitar, count: favoritos.length }),
    [favoritos, esFavorito, toggle, quitar],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}