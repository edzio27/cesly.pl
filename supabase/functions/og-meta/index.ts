import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

    const images: string[] = Array.isArray(listing.images) && listing.images.length > 0
      ? listing.images
      : ['https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200'];
    const mainImage = images[0];

    const price = listing.price_type === 'monthly'
      ? `${listing.monthly_payment} zł/mies.`
      : `${listing.monthly_payment} zł`;

    const shortDescription = `${listing.brand} ${listing.model} ${listing.year} - ${price}. ${listing.description.slice(0, 150)}${listing.description.length > 150 ? '...' : ''}`;
    const canonicalUrl = `https://cesly.pl/listing/${listingId}`;

    const title = escapeHtml(listing.title || `${listing.brand} ${listing.model} ${listing.year}`);
    const metaDescription = escapeHtml(shortDescription);

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${listing.brand} ${listing.model} ${listing.year}`,
      description: listing.description,
      image: images,
      brand: {
        '@type': 'Brand',
        name: listing.brand,
      },
      model: listing.model,
      productionDate: listing.year?.toString(),
      mileageFromOdometer: listing.mileage ? {
        '@type': 'QuantitativeValue',
        value: listing.mileage,
        unitCode: 'KMT',
      } : undefined,
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'PLN',
        price: listing.monthly_payment,
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        availability: 'https://schema.org/InStock',
      },
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Typ oferty', value: 'Cesja leasingu' },
        { '@type': 'PropertyValue', name: 'Pozostałe raty', value: `${listing.remaining_installments} / ${listing.total_installments}` },
        { '@type': 'PropertyValue', name: 'Odstępne', value: `${listing.transfer_fee} zł` },
        { '@type': 'PropertyValue', name: 'Typ pojazdu', value: listing.vehicle_type },
      ],
    };

    const specRows: string[] = [
      `<tr><th>Rata miesięczna</th><td>${escapeHtml(String(listing.monthly_payment))} zł</td></tr>`,
      `<tr><th>Odstępne</th><td>${escapeHtml(String(listing.transfer_fee))} zł</td></tr>`,
      listing.buyout_price ? `<tr><th>Wykup</th><td>${escapeHtml(String(listing.buyout_price))} zł</td></tr>` : '',
      `<tr><th>Pozostałe raty</th><td>${escapeHtml(String(listing.remaining_installments))} / ${escapeHtml(String(listing.total_installments))}</td></tr>`,
      listing.mileage ? `<tr><th>Przebieg</th><td>${escapeHtml(String(listing.mileage))} km</td></tr>` : '',
      `<tr><th>Typ pojazdu</th><td>${escapeHtml(listing.vehicle_type)}</td></tr>`,
      listing.fuel_type ? `<tr><th>Paliwo</th><td>${escapeHtml(listing.fuel_type)}</td></tr>` : '',
    ].filter(Boolean);

    const galleryHtml = images.slice(0, 8).map((img, i) =>
      `<img src="${escapeHtml(img)}" alt="${title} - zdjęcie ${i + 1}" loading="lazy" width="300" height="300" />`
    ).join('\n      ');

    const html = `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="https://cesly.pl/cesly_logo_transparent_clean.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} - Cesja leasingu | Cesly.pl</title>
    <meta name="description" content="${metaDescription}" />
    <meta name="robots" content="index, follow" />

    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="Cesly.pl" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${metaDescription}" />
    <meta property="og:image" content="${escapeHtml(mainImage)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(mainImage)}" />
    <meta property="og:url" content="${canonicalUrl}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${metaDescription}" />
    <meta name="twitter:image" content="${escapeHtml(mainImage)}" />

    <link rel="canonical" href="${canonicalUrl}" />

    <script type="application/ld+json">${JSON.stringify(structuredData)}</script>

    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 1.5rem; color: #1f2937; }
      h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
      .price { font-size: 1.25rem; font-weight: 700; color: #d97706; margin-bottom: 1rem; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
      th, td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
      th { color: #6b7280; font-weight: 600; width: 45%; }
      .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.5rem; margin-bottom: 1.5rem; }
      .gallery img { width: 100%; height: auto; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 8px; }
      .cta { display: inline-block; background: #d97706; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; }
      .description { white-space: pre-wrap; line-height: 1.5; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p class="price">${escapeHtml(price)}</p>

    <table>
      ${specRows.join('\n      ')}
    </table>

    <div class="gallery">
      ${galleryHtml}
    </div>

    <h2>Opis</h2>
    <p class="description">${escapeHtml(listing.description)}</p>

    <p><a class="cta" href="${canonicalUrl}">Zobacz pełne ogłoszenie i skontaktuj się ze sprzedającym</a></p>
  </body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200',
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
