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
    const url = new URL(req.url);
    const listingId = url.searchParams.get('id');

    if (!listingId) {
      return new Response('Missing listing ID', { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: listing, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .maybeSingle();

    if (error || !listing) {
      return new Response('Listing not found', { status: 404, headers: corsHeaders });
    }

    const image = listing.images && listing.images.length > 0
      ? listing.images[0]
      : 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200';

    const price = listing.price_type === 'monthly'
      ? `${listing.price} zł/mies`
      : `${listing.price} zł`;

    const description = `${listing.brand} ${listing.model} ${listing.year} - ${price}. ${listing.description.substring(0, 150)}${listing.description.length > 150 ? '...' : ''}`;

    const html = `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="https://cesly.pl/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${listing.title} - Cesly</title>
    <meta name="description" content="${description.replace(/"/g, '&quot;')}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Cesly" />
    <meta property="og:title" content="${listing.title}" />
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="https://nuvafrdwxbzxyowrtnxp.supabase.co/functions/v1/og-meta?id=${listingId}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${listing.title}" />
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${image}" />

    <meta http-equiv="refresh" content="0; url=https://cesly.pl/#/listing/${listingId}" />
    <script>window.location.href = "https://cesly.pl/#/listing/${listingId}";</script>
  </head>
  <body>
    <p>Przekierowywanie do <a href="https://cesly.pl/listing/${listingId}">ogłoszenia</a>...</p>
  </body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: corsHeaders
    });
  }
});
