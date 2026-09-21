import { next, rewrite } from '@vercel/edge';

/**
 * Statyczny render strony głównej dla crawlerów.
 *
 * Reguły `rewrites` z vercel.json stosują się dopiero PO sprawdzeniu systemu
 * plików, więc dla `/` nigdy nie dochodzą do głosu — Vercel serwuje statyczny
 * `index.html` z buildu i na tym kończy. Działa to dla `/listing/:id`
 * i `/cesja-leasingu/:slug`, bo pod tymi ścieżkami żaden plik nie istnieje,
 * ale strona główna wymaga przechwycenia przed systemem plików. Middleware
 * jest jedynym miejscem, które odpala się wcześniej.
 *
 * `matcher` celowo obejmuje wyłącznie `/`. Reszta routingu — zasoby, SPA,
 * pozostałe przepisania — zostaje w vercel.json nietknięta.
 */

export const config = { matcher: '/' };

// Ta sama lista co warunki `has` w vercel.json i proxy dev w vite.config.ts.
const CRAWLER_UA =
  /(bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|slack|discord|skype|anthropic|cohere|chatgpt|pinterest)/i;

const SEO_PAGE = 'https://nuvafrdwxbzxyowrtnxp.supabase.co/functions/v1/seo-page';

export default function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') ?? '';

  // Człowiek dostaje normalny index.html i aplikację React.
  if (!CRAWLER_UA.test(userAgent)) return next();

  return rewrite(SEO_PAGE);
}
