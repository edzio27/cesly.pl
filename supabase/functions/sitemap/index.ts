import { createClient } from 'npm:@supabase/supabase-js@2';
import { categoryUrl, indexableCategories } from '../_shared/seoCategories.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Kolumny filtrów dociągamy razem z resztą, bo ta sama lista służy do
    // policzenia, które kategorie mają dość ofert, żeby trafić do sitemapy.
    const { data: listings, error } = await supabase
      .from('listings')
      .select(
        'id, created_at, title, brand, model, images, vehicle_type, monthly_payment, transfer_fee, remaining_installments',
      )
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const rows = listings || [];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://cesly.pl/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>https://cesly.pl/og-image.png</image:loc>
      <image:title>Cesly.pl - Cesja leasingu</image:title>
      <image:caption>Portal ogłoszeń cesji i przejęcia leasingu samochodów</image:caption>
    </image:image>
  </url>
  <url>
    <loc>https://cesly.pl/regulamin</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://cesly.pl/polityka-prywatnosci</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
`;

    // Strony kategorii. Trafiają tu wyłącznie te z realną liczbą ofert —
    // zgłoszenie Google'owi pustej kategorii to zaproszenie do potraktowania
    // jej jako soft 404. Lista rośnie sama, w miarę jak przybywa ogłoszeń.
    for (const { category, count } of indexableCategories(rows)) {
      sitemap += `  <url>
    <loc>https://cesly.pl${categoryUrl(category)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${count >= 10 ? '0.9' : '0.7'}</priority>
  </url>
`;
    }

    for (const listing of rows) {
      const lastmod = new Date(listing.created_at).toISOString().split('T')[0];
      const listingTitle = escapeXml(`${listing.brand ?? ''} ${listing.model ?? ''} - Cesja leasingu`.trim());

      sitemap += `  <url>
    <loc>https://cesly.pl/listing/${listing.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
`;

      if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) {
        for (let i = 0; i < Math.min(listing.images.length, 5); i++) {
          const imageUrl = escapeXml(String(listing.images[i]));
          sitemap += `    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${listingTitle}</image:title>
      <image:caption>${escapeXml(`${listing.brand ?? ''} ${listing.model ?? ''} - Przejęcie umowy leasingowej`.trim())}</image:caption>
    </image:image>
`;
        }
      }

      sitemap += `  </url>
`;
    }

    sitemap += '</urlset>';

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate sitemap' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
