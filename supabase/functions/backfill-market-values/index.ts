import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function estimateValue(apiKey: string, brand: string, model: string, year: number, mileage: number | null, priceType: string): Promise<number | null> {
  const mileageText = mileage ? `${mileage.toLocaleString()} km` : "nieznany";
  const vatText = priceType === "netto" ? "netto (firma, bez VAT)" : "brutto (osoba prywatna, z VAT)";

  const prompt = `Oszacuj aktualną wartość rynkową pojazdu na polskim rynku w złotych (PLN). Odpowiedz WYŁĄCZNIE jedną liczbą całkowitą bez spacji, kropek ani jednostek. Przykład poprawnej odpowiedzi: 87000

Dane pojazdu:
- Marka: ${brand}
- Model: ${model}
- Rok produkcji: ${year}
- Przebieg: ${mileageText}
- Typ transakcji: ${vatText}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 50,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return null;
  const result = await res.json();
  const raw = result.content?.[0]?.text?.trim() ?? "";
  const value = parseInt(raw.replace(/\D/g, ""), 10);
  return isNaN(value) || value <= 0 ? null : value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured", processed: 0 }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: listings, error } = await supabase
      .from("listings")
      .select("id, brand, model, year, mileage, price_type")
      .is("market_value", null)
      .in("status", ["active", "published"])
      .limit(30);

    if (error) throw error;
    if (!listings || listings.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    for (const listing of listings) {
      const value = await estimateValue(
        apiKey,
        listing.brand,
        listing.model,
        listing.year,
        listing.mileage,
        listing.price_type || "brutto"
      );
      if (value !== null) {
        await supabase.from("listings").update({ market_value: value }).eq("id", listing.id);
        processed++;
      }
      // small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ processed, total: listings.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, processed: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
