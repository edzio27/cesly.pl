import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/listing': {
        target: 'https://nuvafrdwxbzxyowrtnxp.supabase.co/functions/v1/og-meta',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/listing/, '/listing'),
      },
    },
  },
});
