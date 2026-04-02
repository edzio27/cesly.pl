import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParsedCarData {
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  monthly_payment?: number;
  remaining_payments?: number;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  description?: string;
  location?: string;
  images?: string[];
}

function extractCarInfo(text: string): ParsedCarData {
  const result: ParsedCarData = {};

  const brandModelPatterns = [
    /^([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+([A-Z0-9][A-Za-z0-9\s-]+?)\s+(?:20\d{2}|19\d{2})/m,
    /^([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+([A-Z0-9][A-Za-z0-9\s-]+)/m,
    /(?:marka|brand|auto)[\s:]+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż0-9\s-]+)/i,
    /([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż0-9\s-]+)\s+(?:rok|rocznik|r\.)/i,
  ];

  for (const pattern of brandModelPatterns) {
    const match = text.match(pattern);
    if (match) {
      const potentialBrand = match[1].trim();
      const potentialModel = match[2].trim();

      const commonWords = ['sprzedam', 'cesja', 'przejęcie', 'leasing', 'okazja', 'stan', 'super'];
      if (!commonWords.some(word => potentialBrand.toLowerCase().includes(word))) {
        result.brand = potentialBrand;
        result.model = potentialModel.split(/\s+/).slice(0, 3).join(' ');
        break;
      }
    }
  }

  const yearPattern = /(?:rok|rocznik|r\.|z\s+roku)[\s:]*(\d{4})/i;
  const yearMatch = text.match(yearPattern);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 1990 && year <= new Date().getFullYear() + 1) {
      result.year = year;
    }
  }

  const pricePatterns = [
    /(?:cena|price|koszt|wykup|wartość wykupu)[\s:]+(\d+[\s\.]?\d*)\s*(?:zł|pln|PLN)/i,
    /wykup[\s:]+(\d+[\s\.]?\d*)/i,
  ];
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.price = parseInt(match[1].replace(/[\s\.]/g, ''));
      break;
    }
  }

  const monthlyPaymentPatterns = [
    /(?:rata|miesięczna|miesięcznie|płatność)[\s:]+(\d+[\s\.]?\d*)\s*(?:zł|pln|PLN)/i,
    /(\d+[\s\.]?\d*)\s*(?:zł|pln|PLN)[\s\/]+m-c/i,
  ];
  for (const pattern of monthlyPaymentPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.monthly_payment = parseInt(match[1].replace(/[\s\.]/g, ''));
      break;
    }
  }

  const remainingPattern = /(?:pozostało|pozostaje|zostało)[\s:]*(\d+)\s*(?:rat|miesięcy|m-cy)/i;
  const remainingMatch = text.match(remainingPattern);
  if (remainingMatch) {
    result.remaining_payments = parseInt(remainingMatch[1]);
  }

  const mileagePatterns = [
    /(?:przebieg|km|kilometry)[\s:]+(\d+[\s\.]?\d*)\s*(?:km|tysięcy)?/i,
    /(\d+[\s\.]?\d*)\s*(?:km|tys\.?\s*km)/i,
  ];
  for (const pattern of mileagePatterns) {
    const match = text.match(pattern);
    if (match) {
      let mileage = parseInt(match[1].replace(/[\s\.]/g, ''));
      if (mileage < 1000) {
        mileage *= 1000;
      }
      result.mileage = mileage;
      break;
    }
  }

  const fuelPatterns = [
    /(?:paliwo|silnik)[\s:]+([a-ząćęłńóśźż]+)/i,
    /(benzyna|diesel|hybryda|elektryczny|LPG|CNG)/i,
  ];
  for (const pattern of fuelPatterns) {
    const match = text.match(pattern);
    if (match) {
      const fuel = match[1].toLowerCase();
      if (fuel.includes('benz')) result.fuel_type = 'Benzyna';
      else if (fuel.includes('dies')) result.fuel_type = 'Diesel';
      else if (fuel.includes('hybr')) result.fuel_type = 'Hybryda';
      else if (fuel.includes('elek')) result.fuel_type = 'Elektryczny';
      else if (fuel.includes('lpg')) result.fuel_type = 'LPG';
      else if (fuel.includes('cng')) result.fuel_type = 'CNG';
      break;
    }
  }

  const transmissionPatterns = [
    /(?:skrzynia|przekładnia)[\s:]+([a-ząćęłńóśźż]+)/i,
    /(automat|automatyczna|manualna|manual)/i,
  ];
  for (const pattern of transmissionPatterns) {
    const match = text.match(pattern);
    if (match) {
      const trans = match[1].toLowerCase();
      if (trans.includes('auto')) result.transmission = 'Automatyczna';
      else if (trans.includes('man')) result.transmission = 'Manualna';
      break;
    }
  }

  const locationPattern = /(?:lokalizacja|miejsce|miasto)[\s:]+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)/i;
  const locationMatch = text.match(locationPattern);
  if (locationMatch) {
    const location = locationMatch[1].trim().split('\n')[0];
    result.location = location;
  }

  if (result.brand && result.model) {
    result.title = `${result.brand} ${result.model}${result.year ? ` ${result.year}` : ''}`;
  }

  result.description = text.trim();

  return result;
}

async function fetchFacebookPost(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Facebook post: ${response.status}`);
    }

    const html = await response.text();
    return html;
  } catch (error) {
    console.error('Error fetching Facebook post:', error);
    throw error;
  }
}

function extractTextFromHTML(html: string): string {
  const textPattern = /<div[^>]*data-ad-preview="message"[^>]*>([\s\S]*?)<\/div>/i;
  const match = html.match(textPattern);

  if (match) {
    return match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  const metaDescPattern = /<meta\s+property="og:description"\s+content="([^"]+)"/i;
  const metaMatch = html.match(metaDescPattern);
  if (metaMatch) {
    return metaMatch[1].trim();
  }

  return '';
}

function extractImages(html: string): string[] {
  const images: string[] = [];
  const imgPattern = /<img[^>]+src="([^"]+)"[^>]*>/gi;
  let match;

  while ((match = imgPattern.exec(html)) !== null) {
    const src = match[1];
    if (src.includes('scontent') || src.includes('fbcdn')) {
      const cleanSrc = src.replace(/&amp;/g, '&');
      if (!images.includes(cleanSrc)) {
        images.push(cleanSrc);
      }
    }
  }

  return images.slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

    if (body.text && typeof body.text === 'string') {
      const carData = extractCarInfo(body.text);

      if (body.images && Array.isArray(body.images)) {
        carData.images = body.images;
      }

      if (body.url && typeof body.url === 'string') {
        carData.description = `${carData.description}\n\nŹródło: ${body.url}`;
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: carData,
          raw_text: body.text
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { url } = body;

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Either "text" or "url" is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!url.includes('facebook.com') && !url.includes('fb.com')) {
      return new Response(
        JSON.stringify({ error: 'Invalid Facebook URL' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const html = await fetchFacebookPost(url);
    const text = extractTextFromHTML(html);
    const images = extractImages(html);

    if (!text) {
      return new Response(
        JSON.stringify({
          error: 'Could not extract text from Facebook post. The post might be private or require login.',
          data: null
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const carData = extractCarInfo(text);
    carData.images = images;

    return new Response(
      JSON.stringify({
        success: true,
        data: carData,
        raw_text: text
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error parsing Facebook post:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to parse Facebook post',
        details: error.message
      }),
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
