/**
 * Statyczny render strony głównej i stron kategorii dla crawlerów.
 *
 * Aplikacja jest SPA (Vite + React), więc cała treść powstaje dopiero po
 * wykonaniu JS. GPTBot, ClaudeBot, PerplexityBot i w dużej mierze Bingbot
 * JS-a nie wykonują — przed tą funkcją dostawały z `/` sam szkielet 4 kB
 * z `<title>` i JSON-LD, bez jednego zdania treści. Googlebot renderuje JS,
 * ale z opóźnieniem i nie zawsze.
 *
 * `og-meta` rozwiązywał to wcześniej wyłącznie dla `/listing/:id`. Ta funkcja
 * domyka pozostałe dwa typy stron:
 *   - `/`                        → strona główna
 *   - `/cesja-leasingu/<slug>`   → strona kategorii
 *
 * Renderujemy dokładnie tę samą treść, którą widzi człowiek (te same oferty,
 * ten sam tekst z `_shared/seoContent.ts`) — to jest dynamic rendering, nie
 * cloaking. Różni się wyłącznie warstwa prezentacji.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  applyCategoryQuery,
  categoryUrl,
  CountableListing,
  findCategory,
  indexableCategories,
  MIN_LISTINGS_TO_INDEX,
  parseCategorySlug,
  SeoCategory,
} from '../_shared/seoCategories.ts';
import {
  FAQ_ITEMS,
  HOME_HEADING,
  HOME_LEAD,
  HOW_IT_WORKS_STEPS,
  TAKEOVER_BENEFITS,
  WHAT_IS_CESJA_BODY,
  WHAT_IS_CESJA_HEADING,
} from '../_shared/seoContent.ts';

const SITE = 'https://cesly.pl';

/** Ile ofert wypisujemy na stronie. Żadna kategoria nie zbliża się dziś do tego pułapu. */
const MAX_LISTINGS_RENDERED = 60;

/**
 * Górny limit wierszy pobieranych do statystyk i zliczania kategorii. Przy
 * kilkudziesięciu ogłoszeniach to jedno tanie zapytanie; gdy baza przekroczy
 * ten próg, liczenie trzeba przenieść do widoku w Postgresie.
 */
const MAX_ROWS_FOR_STATS = 5000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

type ListingRow = {
  id: string;
  title: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  monthly_payment: number | null;
  transfer_fee: number | null;
  buyout_price: number | null;
  remaining_installments: number | null;
  total_installments: number | null;
  vehicle_type: string | null;
  images: string[] | null;
  created_at: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPLN(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value).toLocaleString('pl-PL')} zł`;
}

function median(values: number[]): number | null {
  const usable = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (usable.length === 0) return null;
  const mid = Math.floor(usable.length / 2);
  return usable.length % 2 ? usable[mid] : (usable[mid - 1] + usable[mid]) / 2;
}

/**
 * Rata powiększona o odstępne rozłożone na pozostałe miesiące.
 * Odpowiednik `listingCosts().effectiveMonthly` z `src/utils/listingMetrics.ts`
 * — wzór musi zostać zgodny z aplikacją, bo obie wersje strony pokazują
 * tę samą liczbę.
 */
function effectiveMonthly(listing: ListingRow): number {
  const monthly = Number(listing.monthly_payment ?? 0);
  const fee = Number(listing.transfer_fee ?? 0);
  const monthsLeft = Number(listing.remaining_installments ?? 0);
  return monthsLeft > 0 ? monthly + fee / monthsLeft : monthly;
}

function listingHeading(listing: ListingRow): string {
  const fromParts = [listing.brand, listing.model, listing.year].filter(Boolean).join(' ');
  return listing.title || fromParts || 'Cesja leasingu';
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1).trimEnd()}…`;
}

/** Zdanie ze statystykami — to ono odróżnia od siebie strony kategorii. */
function statsSentence(listings: ListingRow[]): string {
  if (listings.length === 0) return '';

  const medianPayment = median(listings.map((row) => Number(row.monthly_payment ?? 0)));
  const medianFee = median(listings.map((row) => Number(row.transfer_fee ?? 0)));
  const cheapest = Math.min(...listings.map(effectiveMonthly).filter((value) => value > 0));
  const noFee = listings.filter((row) => !Number(row.transfer_fee ?? 0)).length;

  const parts: string[] = [`Aktualnie dostępnych ofert: ${listings.length}.`];
  if (medianPayment != null) parts.push(`Mediana raty miesięcznej: ${formatPLN(medianPayment)}.`);
  if (medianFee != null) parts.push(`Mediana odstępnego: ${formatPLN(medianFee)}.`);
  else if (noFee > 0) parts.push('Żadna z ofert nie wymaga odstępnego.');
  if (Number.isFinite(cheapest)) {
    parts.push(`Najniższy realny koszt miesięczny: ${formatPLN(cheapest)}.`);
  }
  if (noFee > 0 && medianFee != null) {
    parts.push(`Bez odstępnego: ${noFee} z ${listings.length}.`);
  }
  return parts.join(' ');
}

function renderListings(listings: ListingRow[]): string {
  if (listings.length === 0) {
    return `<p class="empty">Nie ma tu w tej chwili żadnej oferty. Nowe cesje pojawiają się co kilka dni —
      <a href="${SITE}/">zobacz wszystkie aktualne ogłoszenia</a>.</p>`;
  }

  return `<ul class="listings">
    ${listings
      .map((listing) => {
        const heading = escapeHtml(listingHeading(listing));
        const url = `${SITE}/listing/${listing.id}`;
        const image = Array.isArray(listing.images) && listing.images.length > 0 ? listing.images[0] : null;
        const rows = [
          `<div><dt>Rata</dt><dd>${escapeHtml(formatPLN(listing.monthly_payment))}/mies.</dd></div>`,
          `<div><dt>Odstępne</dt><dd>${
            Number(listing.transfer_fee ?? 0) > 0 ? escapeHtml(formatPLN(listing.transfer_fee)) : 'brak'
          }</dd></div>`,
          listing.remaining_installments
            ? `<div><dt>Pozostałe raty</dt><dd>${escapeHtml(String(listing.remaining_installments))}${
                listing.total_installments ? ` / ${escapeHtml(String(listing.total_installments))}` : ''
              }</dd></div>`
            : '',
          `<div><dt>Realny koszt</dt><dd>${escapeHtml(formatPLN(effectiveMonthly(listing)))}/mies.</dd></div>`,
          listing.mileage
            ? `<div><dt>Przebieg</dt><dd>${Number(listing.mileage).toLocaleString('pl-PL')} km</dd></div>`
            : '',
        ].filter(Boolean);

        return `<li>
      ${
        image
          ? `<a href="${url}" class="thumb"><img src="${escapeHtml(image)}" alt="${heading}" loading="lazy" width="200" height="150" /></a>`
          : ''
      }
      <div class="body">
        <h3><a href="${url}">${heading}</a></h3>
        <dl>${rows.join('')}</dl>
      </div>
    </li>`;
      })
      .join('\n    ')}
  </ul>`;
}

/**
 * Linki do pozostałych kategorii. To jedyna ścieżka, którą crawler dociera
 * z jednej kategorii do drugiej — stopka aplikacji jest po stronie JS.
 */
function renderCategoryLinks(
  entries: { category: SeoCategory; count: number }[],
  currentSlug: string | null,
  heading: string,
): string {
  const links = entries
    .filter((entry) => entry.category.slug !== currentSlug)
    .map(
      (entry) =>
        `<li><a href="${SITE}${categoryUrl(entry.category)}">${escapeHtml(entry.category.label)}</a> <span class="count">${entry.count}</span></li>`,
    );

  if (links.length === 0) return '';

  return `<section class="related">
      <h2>${escapeHtml(heading)}</h2>
      <ul class="links">
        ${links.join('\n        ')}
      </ul>
    </section>`;
}

function renderFaq(): string {
  return `<section>
      <h2>Najczęściej zadawane pytania</h2>
      ${FAQ_ITEMS.map(
        (item) => `<h3>${escapeHtml(item.question)}</h3>
      <p>${escapeHtml(item.answer)}</p>`,
      ).join('\n      ')}
    </section>`;
}

const STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 860px; margin: 0 auto; padding: 1.5rem; color: #1f2937; line-height: 1.55; }
  h1 { font-size: 1.75rem; line-height: 1.2; margin-bottom: 0.5rem; }
  h2 { font-size: 1.25rem; margin-top: 2.25rem; }
  h3 { font-size: 1rem; margin-bottom: 0.25rem; }
  a { color: #b45309; }
  .lead { font-size: 1.05rem; color: #374151; }
  .stats { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.9rem; }
  nav.crumbs { font-size: 0.85rem; color: #6b7280; margin-bottom: 1rem; }
  ul.listings { list-style: none; padding: 0; margin: 1.25rem 0 0; display: grid; gap: 0.75rem; }
  ul.listings li { display: flex; gap: 0.9rem; border: 1px solid #e5e7eb; border-radius: 12px; padding: 0.75rem; }
  ul.listings img { width: 130px; height: 98px; object-fit: cover; border-radius: 8px; }
  ul.listings h3 { margin: 0 0 0.4rem; font-size: 1rem; }
  ul.listings dl { display: flex; flex-wrap: wrap; gap: 0.25rem 1.1rem; margin: 0; font-size: 0.85rem; }
  ul.listings dl div { display: flex; gap: 0.35rem; }
  ul.listings dt { color: #6b7280; margin: 0; }
  ul.listings dd { margin: 0; font-weight: 600; }
  ul.links { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  ul.links li { border: 1px solid #e5e7eb; border-radius: 999px; padding: 0.35rem 0.8rem; font-size: 0.875rem; }
  ul.links .count { color: #9ca3af; }
  ol.steps { padding-left: 1.1rem; }
  .empty { background: #f9fafb; border-radius: 10px; padding: 1rem; }
  .cta { display: inline-block; background: #d97706; color: #fff; padding: 0.7rem 1.4rem; border-radius: 10px; text-decoration: none; font-weight: 600; margin-top: 1.5rem; }
  footer { margin-top: 2.5rem; border-top: 1px solid #e5e7eb; padding-top: 1rem; font-size: 0.85rem; color: #6b7280; }
`;

function page(options: {
  title: string;
  description: string;
  canonical: string;
  indexable: boolean;
  structuredData: unknown[];
  body: string;
}): string {
  const { title, description, canonical, indexable, structuredData, body } = options;
  const ogImage = `${SITE}/og-image.png`;

  return `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/png" href="${SITE}/cesly_logo_transparent_clean.png" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="${indexable ? 'index, follow, max-image-preview:large, max-snippet:-1' : 'noindex, follow'}" />
    <meta name="language" content="Polish" />
    <meta name="geo.region" content="PL" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Cesly.pl" />
    <meta property="og:locale" content="pl_PL" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${ogImage}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImage}" />

    ${structuredData
      .map((entry) => `<script type="application/ld+json">${JSON.stringify(entry)}</script>`)
      .join('\n    ')}

    <style>${STYLES}</style>
  </head>
  <body>
${body}
    <footer>
      <p>Cesly.pl — portal ogłoszeń cesji i przejęcia leasingu. Cesly.pl nie jest stroną umowy
      leasingowej ani pośrednikiem finansowym.</p>
      <p><a href="${SITE}/regulamin">Regulamin</a> · <a href="${SITE}/polityka-prywatnosci">Polityka prywatności</a></p>
    </footer>
  </body>
</html>`;
}

function breadcrumbs(category: SeoCategory | null) {
  const items = [{ '@type': 'ListItem', position: 1, name: 'Strona główna', item: `${SITE}/` }];
  if (category) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: category.heading,
      item: `${SITE}${categoryUrl(category)}`,
    });
  }
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

function itemList(listings: ListingRow[], name: string, total: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: total,
    itemListElement: listings.map((listing, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE}/listing/${listing.id}`,
      name: listingHeading(listing),
    })),
  };
}

function renderCategoryPage(
  category: SeoCategory,
  listings: ListingRow[],
  categoryIndex: { category: SeoCategory; count: number }[],
): string {
  const canonical = `${SITE}${categoryUrl(category)}`;
  const indexable = listings.length >= MIN_LISTINGS_TO_INDEX;
  const stats = statsSentence(listings);

  const title =
    listings.length > 0
      ? `${category.heading} — ${listings.length} ofert | Cesly.pl`
      : `${category.heading} | Cesly.pl`;

  const description = truncate(stats ? `${stats} ${category.lead}` : category.lead, 300);

  const body = `    <nav class="crumbs"><a href="${SITE}/">Cesly.pl</a> › ${escapeHtml(category.heading)}</nav>
    <h1>${escapeHtml(category.heading)}</h1>
    <p class="lead">${escapeHtml(category.lead)}</p>
    ${stats ? `<p class="stats">${escapeHtml(stats)}</p>` : ''}

    <h2>Oferty w tej kategorii</h2>
    ${renderListings(listings)}
    ${
      listings.length >= MAX_LISTINGS_RENDERED
        ? `<p><a href="${SITE}/">Zobacz pełną listę z filtrami</a></p>`
        : ''
    }

    ${renderCategoryLinks(categoryIndex, category.slug, 'Inne kategorie cesji')}

    <section>
      <h2>${escapeHtml(WHAT_IS_CESJA_HEADING)}</h2>
      <p>${escapeHtml(WHAT_IS_CESJA_BODY)}</p>
    </section>

    <p><a class="cta" href="${SITE}/">Przejdź do wyszukiwarki cesji</a></p>`;

  return page({
    title,
    description,
    canonical,
    indexable,
    structuredData: [
      breadcrumbs(category),
      itemList(listings, category.heading, listings.length),
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category.heading,
        description: category.lead,
        url: canonical,
        isPartOf: { '@type': 'WebSite', name: 'Cesly.pl', url: `${SITE}/` },
      },
    ],
    body,
  });
}

function renderHomePage(
  listings: ListingRow[],
  totalCount: number,
  categoryIndex: { category: SeoCategory; count: number }[],
): string {
  const stats = statsSentence(listings);

  const body = `    <h1>${escapeHtml(HOME_HEADING)}</h1>
    <p class="lead">${escapeHtml(HOME_LEAD)}</p>
    ${stats ? `<p class="stats">${escapeHtml(stats)}</p>` : ''}

    ${renderCategoryLinks(categoryIndex, null, 'Przeglądaj cesje według kategorii')}

    <h2>Najnowsze oferty przejęcia leasingu</h2>
    ${renderListings(listings)}

    <section>
      <h2>${escapeHtml(WHAT_IS_CESJA_HEADING)}</h2>
      <p>${escapeHtml(WHAT_IS_CESJA_BODY)}</p>
      <h3>Korzyści z przejęcia leasingu</h3>
      <ul>
        ${TAKEOVER_BENEFITS.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join('\n        ')}
      </ul>
    </section>

    <section>
      <h2>Jak przebiega cesja leasingu</h2>
      <ol class="steps">
        ${HOW_IT_WORKS_STEPS.map(
          (step) => `<li><strong>${escapeHtml(step.title)}</strong> — ${escapeHtml(step.description)}</li>`,
        ).join('\n        ')}
      </ol>
    </section>

    ${renderFaq()}

    <p><a class="cta" href="${SITE}/add">Dodaj ogłoszenie za darmo</a></p>`;

  return page({
    title: 'Cesly.pl – Cesja leasingu i przejęcie umowy leasingowej',
    description: truncate(
      `Oferty cesji i przejęcia leasingu samochodów, motocykli i łodzi w całej Polsce. ${stats}`,
      300,
    ),
    canonical: `${SITE}/`,
    indexable: true,
    structuredData: [
      breadcrumbs(null),
      itemList(listings, 'Najnowsze oferty cesji leasingu', totalCount),
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Cesly.pl',
        url: `${SITE}/`,
        description: 'Platforma do cesji i przejęcia leasingu samochodów w Polsce',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/?search={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
    body,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') ?? parseCategorySlug(url.pathname);

    // Nieznany slug nie może zwrócić strony ze statusem 200 — inaczej każda
    // literówka w adresie stałaby się kolejną pustą stroną w indeksie.
    const category = slug ? findCategory(slug) : null;
    if (slug && !category) {
      return new Response('Nie znaleziono kategorii', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const listingColumns =
      'id, title, brand, model, year, mileage, monthly_payment, transfer_fee, buyout_price, ' +
      'remaining_installments, total_installments, vehicle_type, images, created_at';

    // Lekka projekcja wszystkich opublikowanych ofert — służy wyłącznie do
    // zliczenia, które kategorie mają dość ogłoszeń, by je linkować.
    const countsPromise = supabase
      .from('listings')
      .select('brand, vehicle_type, monthly_payment, transfer_fee, remaining_installments', {
        count: 'exact',
      })
      .eq('status', 'published')
      .limit(MAX_ROWS_FOR_STATS);

    let listingsQuery = supabase
      .from('listings')
      .select(listingColumns)
      .eq('status', 'published');

    if (category) listingsQuery = applyCategoryQuery(listingsQuery, category.query);

    const listingsPromise = listingsQuery
      .order('is_promoted', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(MAX_LISTINGS_RENDERED);

    const [countsResult, listingsResult] = await Promise.all([countsPromise, listingsPromise]);

    if (countsResult.error) throw countsResult.error;
    if (listingsResult.error) throw listingsResult.error;

    const allRows = (countsResult.data ?? []) as CountableListing[];
    const listings = (listingsResult.data ?? []) as ListingRow[];
    const categoryIndex = indexableCategories(allRows);

    const html = category
      ? renderCategoryPage(category, listings, categoryIndex)
      : renderHomePage(listings, countsResult.count ?? allRows.length, categoryIndex);

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('seo-page error:', error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
});
