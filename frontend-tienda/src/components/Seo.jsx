import { useEffect } from 'react'

// SEO dinámico por página/producto/categoría: título, descripción, canonical,
// Open Graph, Twitter cards y datos estructurados (JSON-LD).
//
// Props:
//   title       — título de la página (se le agrega "| Praga Medellín")
//   description — meta description
//   image       — URL absoluta de la imagen para OG/Twitter (opcional)
//   url         — URL canónica (opcional; por defecto usa la actual)
//   jsonLd      — array de objetos JSON-LD a inyectar (opcional)
//   noindex     — si es true, agrega robots noindex (carrito, checkout, etc.)
const BASE = 'Praga Medellín'
const DEFAULT_IMAGE = 'https://pragamedellin.com/og-image.png'
const OG_WIDTH = 1200
const OG_HEIGHT = 630

export default function Seo({ title, description, image, url, jsonLd, noindex }) {
  useEffect(() => {
    const finalTitle = title ? `${title} | ${BASE}` : BASE
    const canon = url || `${window.location.origin}${window.location.pathname}`
    const ogImage = image || DEFAULT_IMAGE

    document.title = finalTitle

    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content || '')
    }

    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`)
      if (!el) {
        el = document.createElement('link')
        el.setAttribute('rel', rel)
        document.head.appendChild(el)
      }
      el.setAttribute('href', href || '')
    }

    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
    setMeta('name', 'description', description || '')
    setMeta('property', 'og:title', finalTitle)
    setMeta('property', 'og:description', description || '')
    setMeta('property', 'og:url', canon)
    setMeta('property', 'og:image', ogImage)
    setMeta('property', 'og:image:alt', description || finalTitle)
    setMeta('property', 'og:image:width', String(OG_WIDTH))
    setMeta('property', 'og:image:height', String(OG_HEIGHT))
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:locale', 'es_CO')
    setMeta('property', 'og:site_name', BASE)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:site', '@praga_medellin_')
    setMeta('name', 'twitter:title', finalTitle)
    setMeta('name', 'twitter:description', description || '')
    setMeta('name', 'twitter:image', ogImage)
    setLink('canonical', canon)

    // JSON-LD: elimina los scripts previos marcados y agrega los nuevos
    document
      .querySelectorAll('script[data-seo-jsonld]')
      .forEach((s) => s.remove())
    ;(jsonLd || []).forEach((obj) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute('data-seo-jsonld', '')
      script.textContent = JSON.stringify(obj)
      document.head.appendChild(script)
    })
  }, [title, description, image, url, jsonLd, noindex])

  return null
}