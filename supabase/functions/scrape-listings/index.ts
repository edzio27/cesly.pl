import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ScrapingSource {
  id: string;
  name: string;
  type: string;
  url: string;
  selector_config: Record<string, string>;
}

interface ScrapedData {
  title?: string;
  price?: number;
  description?: string;
  brand?: string;
  model?: string;
  year?: number;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  location?: string;
  contact_phone?: string;
  images?: string[];
  external_url?: string;
}

async function scrapeWebPage(url: string, selectors: Record<string, string>): Promise<ScrapedData> {
  try {
    const response = await fetch(url);
    const html = await response.text();

    const data: ScrapedData = {
      external_url: url,
    };

    return data;
  } catch (error) {
    console.error('Error scraping webpage:', error);
    throw error;
  }
}

async function scrapeOtomotoRSS(): Promise<ScrapedData[]> {
  try {
    const rssUrl = 'https://www.otomoto.pl/rss/osobowe.xml';
    const response = await fetch(rssUrl);
    const xml = await response.text();

    const listings: ScrapedData[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(itemXml);
      const linkMatch = /<link>(.*?)<\/link>/.exec(itemXml);
      const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(itemXml);

      if (titleMatch && linkMatch) {
        const title = titleMatch[1];
        const cesjaKeywords = ['cesja', 'przejęcie', 'przejecie', 'leasing', 'rata'];
        const hasCesjaKeyword = cesjaKeywords.some(keyword =>
          title.toLowerCase().includes(keyword) ||
          (descMatch && descMatch[1].toLowerCase().includes(keyword))
        );

        if (hasCesjaKeyword) {
          listings.push({
            title: title,
            description: descMatch ? descMatch[1] : '',
            external_url: linkMatch[1],
          });
        }
      }
    }

    return listings;
  } catch (error) {
    console.error('Error scraping Otomoto RSS:', error);
    return [];
  }
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: activeSources } = await supabase
      .from('scraping_sources')
      .select('*')
      .eq('is_active', true);

    if (!activeSources || activeSources.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active scraping sources found', processed: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let totalProcessed = 0;
    const results = [];

    for (const source of activeSources as ScrapingSource[]) {
      try {
        let scrapedData: ScrapedData[] = [];

        if (source.type === 'rss' && source.url.includes('otomoto')) {
          scrapedData = await scrapeOtomotoRSS();
        } else if (source.type === 'web') {
          const data = await scrapeWebPage(source.url, source.selector_config);
          scrapedData = [data];
        }

        for (const data of scrapedData) {
          const externalId = data.external_url || `${Date.now()}_${Math.random()}`;

          const { error: insertError } = await supabase
            .from('scraped_listings')
            .upsert({
              source_id: source.id,
              external_id: externalId,
              raw_data: data,
              status: 'pending',
            }, {
              onConflict: 'source_id,external_id',
              ignoreDuplicates: true,
            });

          if (!insertError) {
            totalProcessed++;
          }
        }

        await supabase
          .from('scraping_sources')
          .update({ last_scraped_at: new Date().toISOString() })
          .eq('id', source.id);

        results.push({
          source: source.name,
          found: scrapedData.length,
          success: true,
        });
      } catch (error) {
        results.push({
          source: source.name,
          error: error.message,
          success: false,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Scraping completed',
        processed: totalProcessed,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
