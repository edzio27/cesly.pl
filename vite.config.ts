import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const FUNCTIONS_BASE = 'https://nuvafrdwxbzxyowrtnxp.supabase.co/functions/v1';

// Lustro reguł `has` z vercel.json: tylko crawlery mają dostawać statyczny HTML
// z funkcji brzegowych. Zwykłe przeglądarki muszą przelecieć do SPA.
const CRAWLER_UA = /(bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|slack|discord|skype|anthropic|cohere|chatgpt|pinterest)/i;

const bypassForHumans = (req: { headers: Record<string, unknown>; url?: string }) => {
  const ua = String(req.headers['user-agent'] || '');
  if (!CRAWLER_UA.test(ua)) return req.url;
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/listing': {
        target: `${FUNCTIONS_BASE}/og-meta`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/listing/, '/listing'),
        bypass: bypassForHumans,
      },
      // Strony kategorii. Renderu strony głównej nie da się tu odwzorować —
      // proxy na '/' przechwyciłoby cały dev server — więc `/` sprawdzamy
      // dopiero na preview albo bezpośrednio na funkcji `seo-page`.
      '/cesja-leasingu': {
        target: `${FUNCTIONS_BASE}/seo-page`,
        changeOrigin: true,
        rewrite: (path) => `/seo-page?slug=${path.replace(/^\/cesja-leasingu\//, '').split('?')[0]}`,
        bypass: bypassForHumans,
      },
    },
  },
});
