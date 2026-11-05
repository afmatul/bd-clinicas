import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // La API corre en :3000; el proxy evita CORS y deja la cookie de sesión en el mismo origen.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
