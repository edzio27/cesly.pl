import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { listingId, brand, model, year, mileage, price_type } = await req.json();

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ market_value: null, error: "ANTHROPIC_API_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mileageText = mileage ? `${mileage.toLocaleString()} km` : "nieznany";
    const vatText = price_type === "netto" ? "netto (firma, bez VAT)" : "brutto (osoba prywatna, z VAT)";

    const prompt = `Oszacuj aktualną wartość rynkową pojazdu na polskim rynku w złotych (PLN). Odpowiedz WYŁĄCZNIE jedną liczbą całkowitą bez spacji, kropek ani jednostek. Przykład poprawnej odpowiedzi: 87000

Dane pojazdu:
- Marka: ${brand}
- Model: ${model}
- Rok produkcji: ${year}
- Przebieg: ${mileageText}
- Typ transakcji: ${vatText}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (!anthropicRes.ok) {
      throw new Error(`Anthropic API error: ${anthropicRes.status}`);
    }

    const result = await anthropicRes.json();
    const raw = result.content?.[0]?.text?.trim() ?? "";
    const marketValue = parseInt(raw.replace(/\D/g, ""), 10);

    if (!isNaN(marketValue) && marketValue > 0 && listingId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("listings").update({ market_value: marketValue }).eq("id", listingId);
    }

    return new Response(
      JSON.stringify({ market_value: isNaN(marketValue) ? null : marketValue }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ market_value: null, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
