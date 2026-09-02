import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const netlifyDevPlugin = () => ({
  name: 'netlify-dev-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url && req.url.startsWith('/.netlify/functions/send-session-email')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { handler } = await import('./netlify/functions/send-session-email.cjs');
            const result = await handler({
              httpMethod: req.method,
              headers: req.headers,
              body
            });
            res.statusCode = result.statusCode || 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(result.body);
          } catch (err) {
            console.error('[Vite Netlify Plugin Error]:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), netlifyDevPlugin()],
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) {
              return 'vendor-firestore';
            }
            if (id.includes('@firebase/auth') || id.includes('firebase/auth')) {
              return 'vendor-firebase-auth';
            }
            if (id.includes('firebase') || id.includes('@firebase')) {
              return 'vendor-firebase-core';
            }
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react-onesignal')) {
              return 'vendor-onesignal';
            }
          }
        }
      }
    }
  },
  server: {
    host: true
  }
});
