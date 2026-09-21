/**
 * Import ofert cesji do kolejki moderacji.
 *
 * Poprzednia wersja nie działała i nie mogła zadziałać: `scrapeWebPage`
 * pobierał HTML i go wyrzucał, zwracając sam adres, a jedyne realne źródło
 * (`https://www.otomoto.pl/rss/osobowe.xml`) od dawna zwraca 404 i jest wprost
 * zablokowane w robots.txt Otomoto (reguła `Disallow` na ścieżkach rss). Efekt: w bazie nie ma
 * ANI JEDNEGO ogłoszenia z importu — wszystkie mają `origin: 'owner'`.
 *
 * Ta wersja czyta dane, które Otomoto renderuje po stronie serwera w
 * `__NEXT_DATA__` zwykłych stron wyników i ofert. To nie są ścieżki `/api/`
 * ani `/ajax/`, które robots.txt wyklucza.
 *
 * Zasady, które celowo respektujemy:
 *   - przedstawiamy się własnym User-Agentem z adresem serwisu i kontaktem,
 *     zamiast podszywać się pod przeglądarkę;
 *   - między żądaniami odczekujemy (REQUEST_DELAY_MS);
 *   - jedno uruchomienie pobiera najwyżej `maxDetails` stron ofert, żeby
 *     zmieścić się w limicie czasu funkcji i nie generować skoków ruchu;
 *   - zapisujemy fakty (marka, model, rocznik, przebieg, rata, odstępne)
 *     i ZAWSZE link do źródła — nie przepisujemy cudzych opisów jako swoich.
 *
 * Nic nie trafia na stronę automatycznie. Rekordy lądują w `scraped_listings`
 * ze statusem `pending` i czekają na decyzję człowieka w panelu.
 *
 * OLX świadomie pominięty: zwraca 403 z CloudFronta nawet na robots.txt,
 * więc pobieranie stamtąd wymagałoby omijania zabezpieczeń.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import {
  isPublishable,
  mentionsCesja,
  parseCesjaEconomics,
} from '../_shared/cesjaParser.ts';
import { buildDescription, buildExcerpt } from '../_shared/listingText.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/** Przedstawiamy się wprost — bez tego byłoby to podszywanie się pod przeglądarkę. */
const USER_AGENT = 'Cesly.pl/1.0 (+https://cesly.pl; kontakt: eugeniusz.keptia@gmail.com)';

const REQUEST_DELAY_MS = 1500;

/** Limit czasu funkcji brzegowej wymusza małe, powtarzalne przebiegi. */
const DEFAULT_MAX_DETAILS = 12;
const DEFAULT_MAX_PAGES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Jedyny dozwolony host. Bez tego ograniczenia `searchUrl` z ciała żądania
 * zamieniłby tę funkcję w otwarte proxy do pobierania dowolnych adresów.
 */
const ALLOWED_HOST = 'www.otomoto.pl';

function isAllowedSearchUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && url.hostname === ALLOWED_HOST;
  } catch {
    return false;
  }
}

/** Tylko te fragmenty odpowiedzi Otomoto, z których faktycznie korzystamy. */
type OtomotoAdvert = {
  title?: string;
  description?: string;
  createdAt?: string;
  images?: { photos?: { url?: string }[] };
  parametersDict?: Record<string, { values?: { value?: string; label?: string }[] }>;
};

type NextData = {
  props?: {
    pageProps?: {
      advert?: OtomotoAdvert;
      urqlState?: Record<string, { data?: unknown }>;
    };
  };
};

type OtomotoNode = {
  id?: string;
  title?: string;
  url?: string;
  shortDescription?: string;
  createdAt?: string;
  price?: { amount?: { units?: number } };
  location?: { city?: { name?: string }; region?: { name?: string } };
  thumbnail?: { x1?: string; x2?: string };
};

async function fetchNextData(url: string): Promise<NextData | null> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    console.error(`scrape-listings: ${response.status} dla ${url}`);
    return null;
  }
  const html = await response.text();
  // Znacznik niesie atrybut `nonce`, więc dopasowanie musi być luźne.
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    console.error(`scrape-listings: brak __NEXT_DATA__ w ${url} (możliwa zmiana strony lub anti-bot)`);
    return null;
  }
  try {
    return JSON.parse(match[1]) as NextData;
  } catch (error) {
    console.error(`scrape-listings: __NEXT_DATA__ nie jest poprawnym JSON-em w ${url}: ${error}`);
    return null;
  }
}

/** Oferty z listy wyników siedzą w cache'u urql, nie w zwykłych propsach. */
function extractSearchNodes(data: NextData): OtomotoNode[] {
  const urqlState = data?.props?.pageProps?.urqlState;
  if (!urqlState) return [];

  for (const key of Object.keys(urqlState)) {
    const raw = urqlState[key]?.data;
    if (typeof raw !== 'string' || !raw.includes('advertSearch')) continue;
    try {
      const parsed = JSON.parse(raw) as { advertSearch?: { edges?: { node?: OtomotoNode }[] } };
      const edges = parsed?.advertSearch?.edges;
      if (Array.isArray(edges)) {
        return edges.map((edge) => edge.node).filter((node): node is OtomotoNode => Boolean(node));
      }
    } catch {
      // Pojedynczy nieparsowalny wpis cache'u nie może wywrócić całego przebiegu.
    }
  }
  return [];
}

function paramValue(advert: OtomotoAdvert, key: string): string | null {
  const entry = advert?.parametersDict?.[key]?.values?.[0];
  return entry?.label ?? entry?.value ?? null;
}

function buildSearchUrl(baseUrl: string, page: number): string {
  const url = new URL(baseUrl);
  if (page > 1) url.searchParams.set('page', String(page));
  return url.toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Wcześniej wystarczała sama OBECNOŚĆ nagłówka — a klucz anon jest publiczny,
    // bo siedzi w bundlu przeglądarki. Dopóki funkcja była zaślepką, nic z tego
    // nie wynikało; teraz odpytuje zewnętrzny serwis i zapisuje wiersze, więc
    // wymagamy realnie zalogowanego użytkownika, a jeśli ustawiono ADMIN_EMAILS,
    // to także obecności na tej liście.
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Brak nagłówka autoryzacji' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: caller } = await authClient.auth.getUser(token);
    if (!caller?.user) {
      return new Response(
        JSON.stringify({ error: 'Wymagane zalogowanie — sam klucz anon nie wystarcza' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminEmails = (Deno.env.get('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.length > 0 && !adminEmails.includes((caller.user.email ?? '').toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Brak uprawnień' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: { sourceId?: string; searchUrl?: string; maxDetails?: number; maxPages?: number } =
      req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const maxDetails = Math.min(Number(body.maxDetails) || DEFAULT_MAX_DETAILS, 40);
    const maxPages = Math.min(Number(body.maxPages) || DEFAULT_MAX_PAGES, 5);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Uruchomienie ad hoc na wskazany adres wyszukiwania: źródło zakładamy
    // w locie, żeby dodanie nowego zapytania nie wymagało osobnego kroku w panelu.
    if (body.searchUrl) {
      if (!isAllowedSearchUrl(body.searchUrl)) {
        return new Response(
          JSON.stringify({ error: `Dozwolone są wyłącznie adresy https://${ALLOWED_HOST}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const { data: existing } = await supabase
        .from('scraping_sources')
        .select('id')
        .eq('url', body.searchUrl)
        .maybeSingle();

      if (existing) {
        body.sourceId = existing.id;
      } else {
        const { data: created, error: createError } = await supabase
          .from('scraping_sources')
          .insert({
            name: `Otomoto: ${new URL(body.searchUrl).pathname.replace(/^\//, '')}`,
            // `scraping_sources.type` dopuszcza tylko 'web' | 'facebook' | 'rss',
            // więc rodzaj źródła rozpoznajemy po hoście, a nie po własnym typie —
            // allowlista i tak zawęża go do jednego serwisu.
            type: 'web',
            url: body.searchUrl,
            is_active: true,
          })
          .select('id')
          .single();
        if (createError || !created) {
          return new Response(
            JSON.stringify({ error: `Nie udało się założyć źródła: ${createError?.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        body.sourceId = created.id;
      }
    }

    let sourcesQuery = supabase.from('scraping_sources').select('*').eq('is_active', true);
    if (body.sourceId) sourcesQuery = sourcesQuery.eq('id', body.sourceId);
    const { data: sources } = await sourcesQuery;

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Brak aktywnych źródeł', processed: 0, results: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const results: Record<string, unknown>[] = [];
    let totalInserted = 0;

    for (const source of sources) {
      // Jedyny obsługiwany parser to Otomoto, więc każde inne źródło
      // (np. stare wpisy typu 'rss' albo 'facebook') pomijamy wprost.
      if (!isAllowedSearchUrl(source.url)) {
        results.push({ source: source.name, skipped: `adres spoza ${ALLOWED_HOST} — brak parsera` });
        continue;
      }

      try {
        // 1. Lista wyników: tanio, jedno żądanie na stronę.
        const candidates: OtomotoNode[] = [];
        for (let page = 1; page <= maxPages; page++) {
          const data = await fetchNextData(buildSearchUrl(source.url, page));
          if (!data) break;
          const nodes = extractSearchNodes(data);
          if (nodes.length === 0) break;

          for (const node of nodes) {
            if (!node.url) continue;
            if (mentionsCesja(`${node.title ?? ''} ${node.shortDescription ?? ''}`)) {
              candidates.push(node);
            }
          }
          if (page < maxPages) await sleep(REQUEST_DELAY_MS);
        }

        // 2. Odsiewamy to, co już mamy — strony ofert są drogie, nie pobieramy
        //    ich dwa razy dla tego samego ogłoszenia.
        //
        //    Sprawdzamy CAŁĄ kolejkę, nie tylko wpisy tego źródła. Wcześniej
        //    zapytanie miało `.eq('source_id', ...)` i to samo ogłoszenie
        //    znalezione z dwóch różnych zapytań (np. „cesja leasingu"
        //    i „przejmę leasing") trafiało do kolejki dwa razy, zmuszając
        //    do ponownej weryfikacji czegoś już przejrzanego.
        const urls = candidates.map((node) => node.url!);
        const { data: known } = await supabase
          .from('scraped_listings')
          .select('external_id')
          .in('external_id', urls);
        const knownIds = new Set((known ?? []).map((row) => row.external_id));
        const fresh = candidates.filter((node) => !knownIds.has(node.url!)).slice(0, maxDetails);

        // 3. Strona oferty: stąd pochodzi opis, a więc rata i odstępne.
        let inserted = 0;
        let complete = 0;
        for (const node of fresh) {
          await sleep(REQUEST_DELAY_MS);

          const detail = await fetchNextData(node.url!);
          const advert = detail?.props?.pageProps?.advert;
          if (!advert) continue;

          // Pełny opis z Otomoto służy WYŁĄCZNIE do wyciągnięcia liczb i nie
          // jest nigdzie zapisywany — to cudzy utwór. Do bazy trafia nasze
          // własne zdanie złożone z faktów oraz krótki, oczyszczony cytat.
          const sourceDescription = String(advert.description ?? '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          const economics = parseCesjaEconomics(`${node.title ?? ''} ${sourceDescription}`);
          const photos: string[] = Array.isArray(advert.images?.photos)
            ? advert.images.photos.map((photo) => photo?.url).filter((url): url is string => Boolean(url)).slice(0, 8)
            : [node.thumbnail?.x2 ?? node.thumbnail?.x1].filter(Boolean) as string[];

          const mileageRaw = paramValue(advert, 'mileage');
          const yearRaw = paramValue(advert, 'year');

          const rawData = {
            external_url: node.url,
            title: advert.title ?? node.title ?? null,
            brand: paramValue(advert, 'make'),
            model: paramValue(advert, 'model'),
            year: yearRaw ? Number(String(yearRaw).replace(/\D/g, '')) || null : null,
            mileage: mileageRaw ? Number(String(mileageRaw).replace(/\D/g, '')) || null : null,
            gearbox: paramValue(advert, 'gearbox'),
            vehicle_type: 'samochód',
            images: photos,
            location: node.location?.city?.name ?? null,
            vehicle_price: node.price?.amount?.units ?? null,
            source_created_at: advert.createdAt ?? node.createdAt ?? null,
            ...economics,
            is_complete: isPublishable(economics),
            // Krótki, oczyszczony z danych kontaktowych fragment oryginału —
            // do weryfikacji w panelu i ewentualnie jako oznaczony cytat.
            source_excerpt: buildExcerpt(sourceDescription),
            // Opis, który faktycznie pójdzie na stronę. Przy publikacji jest
            // składany ponownie, bo moderator może poprawić liczby.
            description: buildDescription({
              brand: paramValue(advert, 'make'),
              model: paramValue(advert, 'model'),
              year: yearRaw ? Number(String(yearRaw).replace(/\D/g, '')) || null : null,
              mileage: mileageRaw ? Number(String(mileageRaw).replace(/\D/g, '')) || null : null,
              gearbox: paramValue(advert, 'gearbox'),
              location: node.location?.city?.name ?? null,
              ...economics,
            }),
          };

          const { error } = await supabase.from('scraped_listings').upsert(
            {
              source_id: source.id,
              external_id: node.url,
              raw_data: rawData,
              status: 'pending',
            },
            { onConflict: 'source_id,external_id', ignoreDuplicates: true },
          );

          if (error) {
            console.error(`scrape-listings: zapis ${node.url} nieudany: ${error.message}`);
            continue;
          }
          inserted++;
          if (rawData.is_complete) complete++;
        }

        await supabase
          .from('scraping_sources')
          .update({ last_scraped_at: new Date().toISOString() })
          .eq('id', source.id);

        totalInserted += inserted;
        results.push({
          source: source.name,
          candidates: candidates.length,
          alreadyKnown: knownIds.size,
          fetched: fresh.length,
          inserted,
          complete,
          success: true,
        });
      } catch (error) {
        console.error(`scrape-listings: źródło ${source.name} — ${error}`);
        results.push({ source: source.name, error: String(error), success: false });
      }
    }

    return new Response(
      JSON.stringify({ message: 'Import zakończony', processed: totalInserted, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('scrape-listings:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
