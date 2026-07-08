import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_DOMAINS = ["otomoto.pl", "olx.pl", "gratka.pl", "facebook.com"];

interface AnalyzeResult {
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  vehicleType: string | null;
  description: string | null;
  needsManualPaste?: true;
}

function emptyResult(): AnalyzeResult {
  return {
    brand: null,
    model: null,
    year: null,
    mileage: null,
    vehicleType: null,
    description: null,
  };
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

async function fetchPageText(url: URL): Promise<string | null> {
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
    return text;
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

    if (text && text.trim()) {
      if (looksLikeUrl(text)) {
        const allowedUrl = isAllowedUrl(text);
        if (!allowedUrl) {
          return new Response(
            JSON.stringify({ ...emptyResult(), needsManualPaste: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const pageText = await fetchPageText(allowedUrl);
        if (!pageText) {
          return new Response(
            JSON.stringify({ ...emptyResult(), needsManualPaste: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        sourceText = pageText;
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
{"brand": string|null, "model": string|null, "year": number|null, "mileage": number|null, "vehicleType": "samochód"|"motocykl"|"łódź"|null, "description": string|null}

Zasady:
- "mileage" to przebieg w kilometrach jako liczba całkowita (np. odczytana z licznika na zdjęciu deski rozdzielczej), bez jednostek.
- "description" to krótki (2-4 zdania), naturalny opis pojazdu po polsku na podstawie dostępnych informacji - stanu, wyposażenia, widocznych cech. Nie wymyślaj warunków finansowych (raty, odstępne, cena wykupu) - to nie jest częścią tego zadania.
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
        max_tokens: 500,
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
      brand: typeof parsed.brand === "string" ? parsed.brand : null,
      model: typeof parsed.model === "string" ? parsed.model : null,
      year: typeof parsed.year === "number" ? parsed.year : null,
      mileage: typeof parsed.mileage === "number" ? parsed.mileage : null,
      vehicleType: typeof parsed.vehicleType === "string" ? parsed.vehicleType : null,
      description: typeof parsed.description === "string" ? parsed.description : null,
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
