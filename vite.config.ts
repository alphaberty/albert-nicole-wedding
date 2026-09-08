import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves project sites from /<repo-name>/. The deploy workflow sets
// VITE_BASE_PATH automatically; locally it defaults to "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    target: 'es2020',
  },
})
