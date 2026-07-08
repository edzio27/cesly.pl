import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_DOMAINS = ["otomoto.pl", "olx.pl", "gratka.pl", "facebook.com"];

interface AnalyzeResult {
  title: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  vehicleType: string | null;
  description: string | null;
  monthlyPayment: number | null;
  transferFee: number | null;
  buyoutPrice: number | null;
  remainingInstallments: number | null;
  totalInstallments: number | null;
  priceType: string | null;
  sourceImages: string[];
  needsManualPaste?: true;
}

function emptyResult(): AnalyzeResult {
  return {
    title: null,
    brand: null,
    model: null,
    year: null,
    mileage: null,
    vehicleType: null,
    description: null,
    monthlyPayment: null,
    transferFee: null,
    buyoutPrice: null,
    remainingInstallments: null,
    totalInstallments: null,
    priceType: null,
    sourceImages: [],
  };
}

// Otomoto and OLX.pl (same parent company, OLX Group) serve every listing
// photo from this CDN, both in the visible gallery and in duplicated
// thumbnail/meta-tag copies elsewhere on the page. Matching this pattern in
// the raw HTML (before stripping tags) reliably recovers the real photo set
// in gallery order - verified against a live Otomoto listing where this
// produced exactly the same 39 URLs, in the same order, as the page's own
// embedded gallery data. Other allow-listed domains (Gratka, Facebook) use
// different CDNs this doesn't match, so they simply yield no photos - an
// expected, non-fatal degradation, not an error.
const OLX_GROUP_CDN_IMAGE_PATTERN = /https:\/\/ireland\.apollo\.olxcdn\.com\/v1\/files\/[A-Za-z0-9._-]+\/image/g;

function extractSourceImages(html: string, max: number): string[] {
  const matches = html.match(OLX_GROUP_CDN_IMAGE_PATTERN) || [];
  return [...new Set(matches)].slice(0, max);
}

function looksLikeUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

function isAllowedUrl(text: string): URL | null {
  try {
    const url = new URL(text.trim());
    const host = url.hostname.replace(/^www\./, "");
    if (ALLOWED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

async function fetchPage(url: URL): Promise<{ text: string; images: string[] } | null> {
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CeslyBot/1.0; +https://cesly.pl)",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const text = stripHtml(html);
    if (text.length < 100) return null;
    return { text, images: extractSourceImages(html, 3) };
  } catch {
    return null;
  }
}

async function fetchImageAsBase64(
  url: string
): Promise<{ mediaType: string; data: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { mediaType: contentType.split(";")[0], data: btoa(binary) };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, imageUrls } = (await req.json()) as {
      text?: string;
      imageUrls?: string[];
    };

    let sourceText = "";
    let sourceImages: string[] = [];

    if (text && text.trim()) {
      if (looksLikeUrl(text)) {
        const allowedUrl = isAllowedUrl(text);
        if (!allowedUrl) {
          return new Response(
            JSON.stringify({ ...emptyResult(), needsManualPaste: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const page = await fetchPage(allowedUrl);
        if (!page) {
          return new Response(
            JSON.stringify({ ...emptyResult(), needsManualPaste: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        sourceText = page.text;
        sourceImages = page.images;
      } else {
        sourceText = text.trim();
      }
    }

    if (!sourceText && (!imageUrls || imageUrls.length === 0)) {
      return new Response(JSON.stringify(emptyResult()), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify(emptyResult()), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content: Record<string, unknown>[] = [];

    if (imageUrls && imageUrls.length > 0) {
      for (const imgUrl of imageUrls.slice(0, 5)) {
        const image = await fetchImageAsBase64(imgUrl);
        if (image) {
          content.push({
            type: "image",
            source: { type: "base64", media_type: image.mediaType, data: image.data },
          });
        }
      }
    }

    const promptText = `Na podstawie poniższych informacji (tekst ogłoszenia i/lub zdjęcia pojazdu) wyodrębnij dane pojazdu. Odpowiedz WYŁĄCZNIE czystym obiektem JSON, bez żadnego dodatkowego tekstu, w formacie:
{"title": string|null, "brand": string|null, "model": string|null, "year": number|null, "mileage": number|null, "vehicleType": "samochód"|"motocykl"|"łódź"|null, "description": string|null, "monthlyPayment": number|null, "transferFee": number|null, "buyoutPrice": number|null, "remainingInstallments": number|null, "totalInstallments": number|null, "priceType": "netto"|"brutto"|null}

Zasady:
- "title" to krótki, zwięzły tytuł ogłoszenia po polsku, w stylu "Marka Model Rok - cesja leasingu" (np. "BMW Seria 8 M850i xDrive 2019 - cesja leasingu") - użyj konkretnej wersji/trimu jeśli jest znana, żeby tytuł wyróżniał się na tle innych ogłoszeń tej samej marki i modelu.
- "mileage" to przebieg w kilometrach jako liczba całkowita (np. odczytana z licznika na zdjęciu deski rozdzielczej), bez jednostek.
- "description" to ORYGINALNY opis ogłoszenia, PRZEPISANY DOSŁOWNIE (nie streszczaj, nie skracaj, nie parafrazuj) - zachowaj wszystkie szczegóły, które sprzedający napisał. Jeśli podany tekst to cała strona internetowa (np. pobrana z Otomoto/OLX), znajdź w niej właściwy opis ogłoszenia i przepisz TYLKO tę część, pomijając menu strony, reklamy, stopkę i inne elementy niezwiązane z opisem pojazdu. Usuń z przepisanego tekstu wszelkie dane kontaktowe sprzedającego z tamtego ogłoszenia (numery telefonu, adresy e-mail, linki) - to nie powinno trafić do nowego ogłoszenia. Jeśli nie da się sensownie wyodrębnić opisu, zwróć null.
- "monthlyPayment" (rata miesięczna), "transferFee" (odstępne za przejęcie umowy), "buyoutPrice" (cena/wartość wykupu), "remainingInstallments" (liczba pozostałych rat do spłaty), "totalInstallments" (całkowita liczba rat w umowie) i "priceType" (czy podane kwoty są netto czy brutto) WYCIĄGAJ WYŁĄCZNIE jeśli są DOSŁOWNIE i JAWNIE podane w tekście jako konkretne liczby/wartości. NIGDY ich nie zgaduj, nie szacuj i nie oblicz na podstawie innych danych (np. na podstawie marki/modelu/roku). Jeśli tekst nie zawiera wprost takiej informacji (np. bo źródłem jest zwykłe ogłoszenie sprzedaży samochodu bez wzmianki o leasingu), zwróć null dla tych pól - to oczekiwany, częsty wynik.
- Jeśli czegoś nie da się ustalić, użyj null dla tego pola.
- Nie dodawaj żadnego wyjaśnienia ani markdown - tylko sam obiekt JSON.

${sourceText ? `Tekst ogłoszenia:\n${sourceText}` : "(brak tekstu, tylko zdjęcia)"}`;

    content.push({ type: "text", text: promptText });

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 2000,
        messages: [{ role: "user", content }],
      }),
    });

    if (!anthropicRes.ok) {
      return new Response(JSON.stringify(emptyResult()), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await anthropicRes.json();
    const raw = result.content?.[0]?.text?.trim() ?? "";

    let parsed: Partial<AnalyzeResult> = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {};
    }

    const out: AnalyzeResult = {
      title: typeof parsed.title === "string" ? parsed.title : null,
      brand: typeof parsed.brand === "string" ? parsed.brand : null,
      model: typeof parsed.model === "string" ? parsed.model : null,
      year: typeof parsed.year === "number" ? parsed.year : null,
      mileage: typeof parsed.mileage === "number" ? parsed.mileage : null,
      vehicleType: typeof parsed.vehicleType === "string" ? parsed.vehicleType : null,
      description: typeof parsed.description === "string" ? parsed.description : null,
      monthlyPayment: typeof parsed.monthlyPayment === "number" ? parsed.monthlyPayment : null,
      transferFee: typeof parsed.transferFee === "number" ? parsed.transferFee : null,
      buyoutPrice: typeof parsed.buyoutPrice === "number" ? parsed.buyoutPrice : null,
      remainingInstallments:
        typeof parsed.remainingInstallments === "number" ? parsed.remainingInstallments : null,
      totalInstallments:
        typeof parsed.totalInstallments === "number" ? parsed.totalInstallments : null,
      priceType:
        parsed.priceType === "netto" || parsed.priceType === "brutto" ? parsed.priceType : null,
      sourceImages,
    };

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify(emptyResult()), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
