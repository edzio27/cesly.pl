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
    let listingId = url.searchParams.get('id');

    if (!listingId) {
      const pathMatch = url.pathname.match(/\/listing\/([a-f0-9-]+)/);
      if (pathMatch) {
        listingId = pathMatch[1];
      }
    }

    if (!listingId) {
      return new Response('Missing listing ID', { status: 400, headers: corsHeaders });
    }

    const userAgent = req.headers.get('user-agent') || '';
    const isCrawler = /bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|slackbot|facebookexternalhit/i.test(userAgent);

    if (!isCrawler) {
      const appUrl = `https://cesly.pl/#/listing/${listingId}`;
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': appUrl,
        },
      });
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
    const appUrl = `https://cesly.pl/#/listing/${listingId}`;
    const shareUrl = `https://nuvafrdwxbzxyowrtnxp.supabase.co/functions/v1/og-meta?id=${listingId}`;

    const html = `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="https://cesly.pl/cesly_logo_transparent_clean.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${listing.title} - Cesly</title>
    <meta name="description" content="${description.replace(/"/g, '&quot;')}" />

    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="Cesly" />
    <meta property="og:title" content="${listing.title}" />
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${shareUrl}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@Cesly" />
    <meta name="twitter:title" content="${listing.title}" />
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${image}" />

    <link rel="canonical" href="${appUrl}" />

    <script>
      (function() {
        var appUrl = "${appUrl}";
        if (window.top !== window.self) {
          window.top.location.replace(appUrl);
        } else {
          window.location.replace(appUrl);
        }
      })();
    </script>

    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .container {
        text-align: center;
        padding: 2rem;
      }
      .spinner {
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 2rem auto;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      a {
        color: white;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="spinner"></div>
      <h1>${listing.title}</h1>
      <p>Przekierowywanie do ogłoszenia...</p>
      <p><a href="${appUrl}">Kliknij tutaj, jeśli przekierowanie nie działa</a></p>
    </div>
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
