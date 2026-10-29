import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The SPA is built into the backend package so the installed tool can serve it.
// In dev, Vite serves the SPA and proxies server paths to `bookvie --dev`.
// `changeOrigin` rewrites Host to 127.0.0.1:8765 so the server's Host guard
// accepts it; Origin stays the Vite origin, which `--dev` allows.
const backend = { target: 'http://127.0.0.1:8765', changeOrigin: true }

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/bookvie/http/static',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': backend,
      '/media': backend,
    },
  },
})
