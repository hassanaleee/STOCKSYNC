import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Any request that starts with /api is passed to the Express server.
    // This way the browser only talks to one address and we avoid CORS problems.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
