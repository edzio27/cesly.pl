import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

async function fetchFacebookPost(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
    },
  });

  if (!response.ok) {
    throw new Error(`Facebook returned ${response.status}. The post might be private or require login. Try making the post public or using the manual listing form instead.`);
  }

  return await response.text();
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

function extractCarInfo(text: string): ParsedCarData {
  const result: ParsedCarData = {};

  const brandModelPatterns = [
    /(?:marka|brand|auto)[\s:]+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż0-9\s-]+)/i,
    /([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż0-9\s-]+)\s+(?:rok|rocznik|r\.)/i,
    /^([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż0-9\s-]+)/m,
  ];

  for (const pattern of brandModelPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.brand = match[1].trim();
      result.model = match[2].trim().split(/\s+/).slice(0, 3).join(' ');
      break;
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

  const locationPattern = /(?:lokalizacja|miejsce|miasto)[\s:]+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)*)/i;
  const locationMatch = text.match(locationPattern);
  if (locationMatch) {
    result.location = locationMatch[1].trim();
  }

  if (result.brand && result.model) {
    result.title = `${result.brand} ${result.model}${result.year ? ` ${result.year}` : ''}`;
  }

  result.description = text.trim();

  return result;
}

async function processJob(jobId: string, url: string, userId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    await supabase
      .from('scraping_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    const html = await fetchFacebookPost(url);
    const text = extractTextFromHTML(html);
    const images = extractImages(html);

    if (!text) {
      throw new Error('Could not extract text from post');
    }

    const carData = extractCarInfo(text);
    carData.images = images;

    const hasEnoughData = carData.brand && carData.model;

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        user_id: userId,
        title: carData.title || carData.brand && carData.model ? `${carData.brand} ${carData.model}` : 'Draft - Uzupełnij dane',
        brand: carData.brand || '',
        model: carData.model || '',
        year: carData.year,
        price: carData.price,
        monthly_payment: carData.monthly_payment,
        remaining_payments: carData.remaining_payments,
        mileage: carData.mileage,
        fuel_type: carData.fuel_type,
        transmission: carData.transmission,
        description: carData.description,
        location: carData.location,
        price_type: carData.monthly_payment ? 'lease' : 'buyout',
        vehicle_type: 'car',
        status: 'draft',
        source_url: url,
      })
      .select()
      .single();

    if (listingError) throw listingError;

    await supabase
      .from('scraping_jobs')
      .update({
        status: 'completed',
        listing_id: listing.id,
        extracted_data: carData,
        processed_at: new Date().toISOString(),
        error_message: hasEnoughData ? null : 'Partial data extracted - requires manual completion',
      })
      .eq('id', jobId);

    return { success: true, listing_id: listing.id, partial: !hasEnoughData };
  } catch (error) {
    await supabase
      .from('scraping_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { job_id, url, user_id } = await req.json();

    if (!job_id || !url || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const result = await processJob(job_id, url, user_id);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing job:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process job',
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
