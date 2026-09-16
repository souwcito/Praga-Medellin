import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base './' para que el build funcione como sitio estático en cualquier carpeta de Hostinger
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
})