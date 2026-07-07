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
        // Mirrors the bot-only routing in vercel.json: only crawlers should
        // see the static og-meta HTML. Regular browsers must fall through
        // to the SPA (index.html) so /listing/:id renders the real app.
        bypass: (req) => {
          const ua = req.headers['user-agent'] || '';
          const isCrawler = /(bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|slack|discord|skype|anthropic|cohere|chatgpt|pinterest)/i.test(ua);
          if (!isCrawler) return req.url;
        },
      },
    },
  },
});
