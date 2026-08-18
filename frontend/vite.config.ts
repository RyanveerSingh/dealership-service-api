import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the UI runs on :5173 and the API on :8080. Proxying /api
    // through Vite keeps them same-origin in the browser, so the dev setup needs
    // no CORS configuration and matches production, where Spring Boot serves the
    // built bundle from its own origin.
    proxy: {
      '/api': 'http://localhost:8080',
      '/actuator': 'http://localhost:8080',
    },
  },
  build: {
    outDir: 'dist',
    // Fail the build rather than silently shipping a chunk that will not load.
    chunkSizeWarningLimit: 900,
  },
})
