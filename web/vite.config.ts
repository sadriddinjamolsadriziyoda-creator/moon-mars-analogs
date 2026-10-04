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

      /**
       * The MOLA basemap lives on a public S3 bucket that serves 200 with a real PNG but
       * sends no Access-Control-Allow-Origin header. A WebGL texture needs CORS, so the map
       * stayed black: a status-code check calls this source healthy. Proxying it through our
       * own origin makes the request same-origin and the tiles actually load.
       *
       * A production deploy needs the same rule on its reverse proxy; tileSources.ts points at
       * the relative path so no code change is needed.
       */
      '/tiles-mars': {
        target: 'https://s3-eu-west-1.amazonaws.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/tiles-mars/, ''),
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