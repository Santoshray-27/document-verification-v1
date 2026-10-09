import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api and /static to the Node brain, so the browser only ever
// talks to one origin (no CORS, no hardcoded hosts).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/static': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
