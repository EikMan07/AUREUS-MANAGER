import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('[Vite Proxy] Error conectando con el backend en http://127.0.0.1:5000:', err.message);
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'El backend no está en ejecución en el puerto 5000.',
                userMessage: 'No se pudo conectar con el servidor backend. Asegúrate de ejecutar el servidor.'
              }));
            }
          });
        },
      },
    },
  },
});
