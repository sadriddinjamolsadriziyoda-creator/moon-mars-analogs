import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
      '@data': fileURLToPath(new URL('../data', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Dev-only: keeps the browser same-origin so no CORS preflight in development.
      // Production uses VITE_API_URL, or nothing at all — the app falls back to bundled JSON.
      '/api': {
        target: process.env.API_ORIGIN ?? 'http://localhost:8787',
        changeOrigin: true,
      },

    },
  },
  build: {
    target: 'es2022',
    // three.js alone is ~600 kB. Splitting it keeps the app shell small enough that
    // the first paint (header, filters, offline banner) does not wait on the globe.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', 'globe.gl'],
          charts: ['recharts'],
          maps: ['maplibre-gl'],
        },
      },
    },
  },
});