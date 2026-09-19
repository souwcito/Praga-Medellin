import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// La tienda vive en la raíz del dominio (pragamedellin.com).
// base '/' (absoluto): los assets cargan bien en cualquier subruta (/producto/:id)
// aunque se recargue la página (sin esto, una recarga en /producto/5 rompería los assets).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
})