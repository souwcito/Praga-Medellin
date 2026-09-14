import { useEffect } from 'react'

// SEO básico: título y metadatos dinámicos por página/producto/categoría.
export default function Seo({ title, description }) {
  useEffect(() => {
    const base = 'Praga Medellín'
    document.title = title ? `${title} | ${base}` : base

    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content || '')
    }

    setMeta('name', 'description', description || '')
    setMeta('property', 'og:title', document.title)
    setMeta('property', 'og:description', description || '')
  }, [title, description])

  return null
}