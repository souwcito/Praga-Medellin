import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base './' para que el build funcione como sitio estático en cualquier carpeta de Hostinger
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'vendor-react'
          }
          if (
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/react-router-dom')
          ) {
            return 'vendor-router'
          }
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios'
          }
          if (
            id.includes('node_modules/@tanstack/react-query') ||
            id.includes('node_modules/@tanstack/query-core')
          ) {
            return 'vendor-query'
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts'
          }
        },
      },
    },
  },
})