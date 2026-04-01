import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, created_at, title, brand, model, images')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://cesly.pl/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>https://cesly.pl/cesly_logo_final.png</image:loc>
      <image:title>Cesly.pl - Cesja leasingu</image:title>
      <image:caption>Portal ogłoszeń cesji i przejęcia leasingu samochodów</image:caption>
    </image:image>
  </url>
`;

    for (const listing of listings || []) {
      const lastmod = new Date(listing.created_at).toISOString().split('T')[0];
      const listingTitle = `${listing.brand} ${listing.model} - Cesja leasingu`;

      sitemap += `  <url>
    <loc>https://cesly.pl/listing/${listing.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
`;

      if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) {
        for (let i = 0; i < Math.min(listing.images.length, 5); i++) {
          const imageUrl = listing.images[i];
          sitemap += `    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${listingTitle}</image:title>
      <image:caption>${listing.brand} ${listing.model} - Przejęcie umowy leasingowej</image:caption>
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
