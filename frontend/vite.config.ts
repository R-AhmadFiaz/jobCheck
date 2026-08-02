import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  server: {
    port: 5173,
    // The backend's CORS allow-list (CLIENT_ORIGIN) is pinned to this exact
    // origin. Without strictPort, a stale process holding 5173 makes Vite
    // silently drift to 5174/5175/... — the app still loads, but every API
    // call then fails CORS in the browser while curl (which ignores CORS)
    // keeps working, which is exactly the confusing failure mode this fixes.
    strictPort: true,
  },
});
