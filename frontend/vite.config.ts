import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The bundle bakes its own version from package.json (AR34), read here so the
// digits live only in the package file. The update notice compares it with
// app-info's version.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

// The SPA is built into the backend package so the installed tool can serve it.
// In dev, Vite serves the SPA and proxies server paths to `bookvie --dev`,
// which listens on 8766 by default. `changeOrigin` rewrites Host to
// 127.0.0.1:8766 so the server's Host guard accepts it; Origin stays the Vite
// origin, which `--dev` allows. `/favicon.svg` goes to the server too, so a
// Vite tab gets the dev server's amber icon, not public/'s sage copy.
const backend = { target: 'http://127.0.0.1:8766', changeOrigin: true }

export default defineConfig({
  plugins: [react()],
  define: {
    __BOOKVIE_VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: '../backend/bookvie/http/static',
    emptyOutDir: true,
    // The CSS minifier rewrites rgba() tokens as hex; tokens.css must reach
    // the browser as DESIGN.md spells it (app-shell.spec.ts AC-1 compares).
    cssMinify: false,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': backend,
      '/media': backend,
      '/favicon.svg': backend,
    },
  },
})
