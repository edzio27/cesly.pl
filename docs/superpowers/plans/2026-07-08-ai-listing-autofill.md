# AI-Assisted Listing Autofill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unreliable regex-based Facebook-post importer in the "Dodaj ogłoszenie" form with a single smart input (paste a listing URL from Otomoto/OLX/Gratka/Facebook, or paste free text) plus already-uploaded photos, both automatically analyzed by Claude to fill in brand/model/year/mileage/vehicleType/description — never the lease-specific financial fields, which stay manual.

**Architecture:** One new Supabase Edge Function (`analyze-listing-input`) does URL fetching (allow-listed domains only), HTML-to-text stripping, and a single Claude Messages API call (text + optional images) that returns strict JSON. `AddListingPage.tsx` gets a new smart-input box wired to that function via a debounced call (text) and an upload-completion watcher (photos), merging results into form state without ever overwriting a field the seller already touched.

**Tech Stack:** React + TypeScript (frontend, existing), Deno Supabase Edge Function (backend, existing pattern from `estimate-car-value`), Anthropic Messages API via the existing `ANTHROPIC_API_KEY` secret, model `claude-haiku-4-5` (same model already used in this project).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-07-ai-listing-autofill-design.md` — read it first if anything below is ambiguous.
- Never auto-fill `monthlyPayment`, `transferFee`, `buyoutPrice`, `remainingInstallments`, `totalInstallments`, or contact fields. Only `brand`, `model`, `year`, `mileage`, `vehicleType`, `description` are ever touched by AI suggestions.
- Never overwrite a field the seller has already edited (tracked via a `touchedFields` set, not "is it empty" — `year` in particular always has a non-empty default value).
- Every failure path (missing API key, network error, unparseable response, disallowed domain) must degrade silently: the manual form must always remain fully usable, no blocking errors.
- **No test runner exists in this repo** (confirmed: `package.json` has no `test` script, no vitest/jest dependency). "Testing" a step means: `npm run typecheck` / `npm run build` for frontend changes, and for the edge function, careful code read-through (no local Deno available in this environment — confirmed via `which deno` returning not found) followed by a live `curl` test against the *deployed* function. Deployment of Supabase Edge Functions requires `supabase functions deploy <name>`, which requires Supabase CLI credentials this environment does not have — **the person executing this plan must run that deploy command themselves** (or ask via Bolt.new, which has proven access to this project this session) before the live-verification steps in Task 5 can run. Say so explicitly when you reach that point; do not skip verification silently.
- Follow existing project conventions: CORS headers object + `Deno.serve` pattern (see `supabase/functions/estimate-car-value/index.ts`), Tailwind utility classes matching sibling elements, `lucide-react` for icons.

---

### Task 1: Build the `analyze-listing-input` edge function

**Files:**
- Delete: `supabase/functions/parse-facebook-post/index.ts` (and the now-empty `supabase/functions/parse-facebook-post/` directory)
- Create: `supabase/functions/analyze-listing-input/index.ts`

**Interfaces:**
- Produces: `POST /functions/v1/analyze-listing-input` accepting `{ text?: string, imageUrls?: string[] }`, returning `{ brand: string|null, model: string|null, year: number|null, mileage: number|null, vehicleType: string|null, description: string|null, needsManualPaste?: true }` with HTTP 200 in all cases (errors are represented in the body, not the status code, matching the existing `estimate-car-value` convention of never surfacing a hard failure to the caller).

- [ ] **Step 1: Delete the old function**

```bash
rm -rf supabase/functions/parse-facebook-post
```

- [ ] **Step 2: Create the new function**

Create `supabase/functions/analyze-listing-input/index.ts`:

```ts
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
```

- [ ] **Step 3: Read through the file once for syntax sanity**

There is no local Deno runtime in this environment to typecheck against (confirmed: `which deno` fails). Read the file top to bottom and confirm: every `{` has a matching `}`, every function that can throw is wrapped in try/catch, and the response shape matches `AnalyzeResult` in every `return`. Live testing happens in Task 5 after deployment — do not skip that step because this one looked fine.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/analyze-listing-input supabase/functions/parse-facebook-post
git commit -m "Replace parse-facebook-post with Claude-powered analyze-listing-input

Regex-based Facebook text parsing (parse-facebook-post) only matched
specific Polish phrasings and never handled Otomoto/OLX/Gratka links
at all. analyze-listing-input calls Claude (reusing the existing
ANTHROPIC_API_KEY already used by estimate-car-value) with pasted
text and/or listing photos, returning strict JSON for brand/model/
year/mileage/vehicleType/description only - never lease-specific
financial fields, which only the seller can know."
```

---

### Task 2: Replace the Facebook-import UI with the smart-input box and core analysis wiring

**Files:**
- Modify: `src/components/AddListingPage.tsx`

**Interfaces:**
- Consumes: `analyze-listing-input` from Task 1 (`POST { text?, imageUrls? } -> { brand, model, year, mileage, vehicleType, description, needsManualPaste? }`).
- Produces: `runAnalysis(payload: { text?: string; imageUrls?: string[] }): Promise<void>` and `applyAnalysisResult(result: {...}): void`, both used by Task 3.

- [ ] **Step 1: Update imports**

In `src/components/AddListingPage.tsx`, replace line 1-2:

```ts
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, X, ImagePlus, Link } from 'lucide-react';
```

with:

```ts
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, X, ImagePlus, Sparkles } from 'lucide-react';
```

(`Link` was only used in the Facebook-import block being replaced below; `Sparkles` is the new icon for the smart-input box.)

- [ ] **Step 2: Replace the Facebook-import state with smart-input state**

Replace lines 43-47:

```ts
  const [fbUrl, setFbUrl] = useState('');
  const [parsingFb, setParsingFb] = useState(false);
  const [fbError, setFbError] = useState('');
  const [fbText, setFbText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
```

with:

```ts
  const [smartInput, setSmartInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [needsManualPaste, setNeedsManualPaste] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const touchedFieldsRef = useRef<Set<string>>(new Set());
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnalyzedImageCountRef = useRef(0);
```

- [ ] **Step 3: Fix the bookmarklet query-param prefill**

The `BookmarkletPage` redirect flow sets `fbUrl` from a `source_url` query param. Find this block (originally around line 113-115):

```ts
      if (sourceUrl) {
        setFbUrl(sourceUrl);
      }
```

Replace with:

```ts
      if (sourceUrl) {
        setSmartInput(sourceUrl);
      }
```

- [ ] **Step 4: Add `touchedFields` sync effect and update `handleChange`**

Find the existing `handleChange` function (originally around line 143-152):

```ts
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'vehicleType') {
      setFormData((prev) => ({ ...prev, vehicleType: value, brand: '', model: '' }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
```

Replace with:

```ts
  useEffect(() => {
    touchedFieldsRef.current = touchedFields;
  }, [touchedFields]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => new Set(prev).add(name));
    setAiFilledFields((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
    if (name === 'vehicleType') {
      setFormData((prev) => ({ ...prev, vehicleType: value, brand: '', model: '' }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
```

- [ ] **Step 5: Add `applyAnalysisResult`, `runAnalysis`, and `handleSmartInputChange`**

Add these three functions immediately after the `handleChange` function from Step 4 (before `const isFreeTextVehicleType = ...`):

```ts
  const applyAnalysisResult = (result: {
    brand: string | null;
    model: string | null;
    year: number | null;
    mileage: number | null;
    vehicleType: string | null;
    description: string | null;
  }) => {
    const filled: string[] = [];

    setFormData((prev) => {
      const next = { ...prev };

      if (
        result.vehicleType &&
        !touchedFieldsRef.current.has('vehicleType') &&
        BRANDS_BY_VEHICLE_TYPE[result.vehicleType]
      ) {
        next.vehicleType = result.vehicleType;
        filled.push('vehicleType');
      }
      if (result.brand && !touchedFieldsRef.current.has('brand')) {
        next.brand = result.brand;
        filled.push('brand');
      }
      if (result.model && !touchedFieldsRef.current.has('model')) {
        next.model = result.model;
        filled.push('model');
      }
      if (result.year && !touchedFieldsRef.current.has('year')) {
        next.year = result.year;
        filled.push('year');
      }
      if (result.mileage && !touchedFieldsRef.current.has('mileage')) {
        next.mileage = result.mileage.toString();
        filled.push('mileage');
      }
      if (result.description && !touchedFieldsRef.current.has('description')) {
        next.description = result.description;
        filled.push('description');
      }

      return next;
    });

    if (filled.length > 0) {
      setAiFilledFields((prev) => {
        const next = new Set(prev);
        filled.forEach((f) => next.add(f));
        return next;
      });
    }
  };

  const runAnalysis = async (payload: { text?: string; imageUrls?: string[] }) => {
    setAnalyzing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-listing-input`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.needsManualPaste) {
        setNeedsManualPaste(true);
        return;
      }

      setNeedsManualPaste(false);
      applyAnalysisResult(result);
    } catch {
      // Silent failure by design - the form stays fully usable manually.
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSmartInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSmartInput(value);
    setNeedsManualPaste(false);

    if (analyzeTimerRef.current) {
      clearTimeout(analyzeTimerRef.current);
    }

    if (!value.trim()) return;

    analyzeTimerRef.current = setTimeout(() => {
      runAnalysis({ text: value.trim() });
    }, 1500);
  };
```

- [ ] **Step 6: Delete the old `parseTextData` and `parseFacebookPost` functions**

Delete the entire `parseTextData` function and the entire `parseFacebookPost` function (originally lines 283-494 - from `const parseTextData = (text: string) => {` through the closing `};` of `parseFacebookPost`). Nothing else in the file calls either function after Step 5's replacements, so this is a clean removal.

- [ ] **Step 7: Replace the Facebook-import JSX with the smart-input box**

Replace the entire block (originally lines 600-677, from `{!editingListing && (` through its matching closing `)}`):

```tsx
        {!editingListing && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Link size={20} className="text-blue-600" />
              Szybkie dodawanie z Facebooka
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {showTextInput
                ? 'Skopiuj treść posta z Facebooka i wklej poniżej. Zdjęcia dodasz ręcznie poniżej.'
                : 'Wklej link do posta z Facebooka lub skopiuj treść ręcznie:'}
            </p>

            {showTextInput ? (
              <div className="space-y-2">
                <textarea
                  value={fbText}
                  onChange={(e) => setFbText(e.target.value)}
                  placeholder="Wklej treść posta z Facebooka tutaj..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={parseFacebookPost}
                    disabled={!fbText.trim()}
                    className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
                  >
                    Wypełnij formularz
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTextInput(false);
                      setFbText('');
                      setFbError('');
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={fbUrl}
                    onChange={(e) => setFbUrl(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={parsingFb}
                  />
                  <button
                    type="button"
                    onClick={parseFacebookPost}
                    disabled={parsingFb || !fbUrl.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold whitespace-nowrap"
                  >
                    {parsingFb ? 'Pobieranie...' : 'Wypełnij'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTextInput(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Lub wklej treść posta ręcznie
                </button>
              </div>
            )}

            {fbError && (
              <p className="mt-2 text-sm text-red-600">{fbError}</p>
            )}
          </div>
        )}
```

with:

```tsx
        {!editingListing && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles size={20} className="text-blue-600" />
              Szybkie wypełnianie
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Wklej link do ogłoszenia (Otomoto, OLX, Gratka, Facebook) lub treść ogłoszenia
              — spróbujemy automatycznie wypełnić markę, model, rok, przebieg i opis.
            </p>

            <textarea
              value={smartInput}
              onChange={handleSmartInputChange}
              placeholder="https://www.otomoto.pl/... lub wklejona treść ogłoszenia"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {analyzing && (
              <p className="mt-2 text-sm text-blue-600">Analizuję...</p>
            )}

            {needsManualPaste && !analyzing && (
              <p className="mt-2 text-sm text-amber-700">
                Nie udało się pobrać tej strony (częste dla Facebooka) — wklej treść
                ogłoszenia ręcznie w polu powyżej zamiast linku.
              </p>
            )}

            {aiFilledFields.size > 0 && (
              <p className="mt-2 text-sm text-amber-700">
                Wypełniliśmy automatycznie pola oznaczone bursztynową ramką poniżej —
                sprawdź je przed zapisaniem.
              </p>
            )}
          </div>
        )}
```

- [ ] **Step 8: Verify the frontend still typechecks and builds**

Run: `npm run typecheck`
Expected: The same pre-existing baseline errors as before this task (unused imports/locals in *other* files, and the two `App.tsx` `Page`-type errors) — no new errors mentioning `AddListingPage.tsx`, `fbUrl`, `fbText`, `parseFacebookPost`, `parseTextData`, or `Link`.

Run: `npm run build`
Expected: `✓ built in <time>` with no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/AddListingPage.tsx
git commit -m "Replace Facebook-only import box with Claude-powered smart input

Removes the old URL/text-paste-then-click-Wypełnij Facebook importer
(regex parsing, alert() popups, Facebook-only) in favor of a single
textarea that accepts a listing URL (Otomoto/OLX/Gratka/Facebook) or
free text and automatically (debounced, no button) calls the new
analyze-listing-input function. Suggestions only fill fields the
seller hasn't touched yet (tracked via touchedFields), never lease
financial fields."
```

---

### Task 3: Trigger analysis automatically when photo uploads finish

**Files:**
- Modify: `src/components/AddListingPage.tsx`

**Interfaces:**
- Consumes: `runAnalysis` and `lastAnalyzedImageCountRef` from Task 2.

- [ ] **Step 1: Add the upload-completion watcher**

Add this `useEffect` immediately after the `useEffect` that syncs `touchedFieldsRef` (added in Task 2 Step 4), so it sits alongside the other effects near the top of the component body:

```ts
  useEffect(() => {
    const anyUploading = images.some((img) => img.uploading);
    if (anyUploading) return;

    const readyUrls = images
      .filter((img) => !img.uploading && !img.error)
      .map((img) => img.value);

    if (readyUrls.length === 0) return;
    if (readyUrls.length === lastAnalyzedImageCountRef.current) return;

    lastAnalyzedImageCountRef.current = readyUrls.length;
    runAnalysis({ text: smartInput.trim() || undefined, imageUrls: readyUrls });
  }, [images]);
```

Note: `images` entries of `type: 'url'` (added via the "Dodaj URL" button) have no `uploading`/`error` properties at all, so `!img.uploading && !img.error` is `true` for them immediately — they're included in `readyUrls` as soon as they're added, same as finished uploads.

- [ ] **Step 2: Manually verify with the dev server**

Start the dev server (see the project's existing `.claude/launch.json` pattern used earlier this session, or `npm run dev` directly) and, on the `/add` page while logged in:
1. Upload a real photo of a car's dashboard/odometer.
2. Wait for the upload to finish (progress reaches 100%).
3. Confirm the "Analizuję..." indicator appears, then the `mileage` field populates if the odometer was legible.

This requires the Task 1 edge function to already be deployed (see Global Constraints) — if it isn't yet, `runAnalysis` will hit a 404/error and silently no-op (per the try/catch in Step 5 of Task 2), which is expected at this point in the plan. Full live verification happens in Task 5 after deployment; this step is a structural sanity check that the effect fires (visible via the "Analizuję..." indicator and a network request in dev tools) even if the function isn't deployed yet.

- [ ] **Step 3: Commit**

```bash
git add src/components/AddListingPage.tsx
git commit -m "Auto-trigger listing analysis when photo uploads finish

Watches the images array for uploads completing (or URL-type images
being added) and re-runs analyze-listing-input with the current photo
set plus whatever text is in the smart-input box, so uploading photos
alone (no pasted text/link) is enough to trigger suggestions."
```

---

### Task 4: Add visible "AI-filled" markers to the suggested fields

**Files:**
- Modify: `src/components/AddListingPage.tsx`

- [ ] **Step 1: Add the class-name helper**

Add this function immediately after `const availableModels = ...` (originally around line 158, right after the two lines computing `availableBrands`/`availableModels`):

```ts
  const fieldClass = (field: string) =>
    `w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      aiFilledFields.has(field)
        ? 'border-2 border-amber-400 bg-amber-50'
        : 'border border-gray-300'
    }`;
```

- [ ] **Step 2: Apply it to the `vehicleType` select**

Find (originally around line 701-708):

```tsx
              <select
                id="vehicleType"
                name="vehicleType"
                required
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
```

Replace `className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"` with `className={fieldClass('vehicleType')}`.

- [ ] **Step 3: Apply it to the `year` input**

Find the `year` input (originally around line 720-730) and replace its `className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"` with `className={fieldClass('year')}`.

- [ ] **Step 4: Apply it to the `mileage` input**

Find the `mileage` input (originally around line 737-746) and replace its `className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"` with `className={fieldClass('mileage')}`.

- [ ] **Step 5: Apply it to both `brand` field variants**

The `brand` field has two branches (free-text input for `vehicleType === 'inne'`, select otherwise). Replace the `className` on both:
- The `<input id="brand" ...>` branch: `className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"` → `className={fieldClass('brand')}`
- The `<select id="brand" ...>` branch: same replacement → `className={fieldClass('brand')}`

- [ ] **Step 6: Apply it to both `model` field variants**

Same pattern as Step 5 for the two `model` branches (free-text input and select) — both get `className={fieldClass('model')}`. For the input branch specifically, its original className included `disabled:bg-gray-100 disabled:cursor-not-allowed`; preserve that by calling `fieldClass('model', '')` and appending it manually:

Find:
```tsx
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
```
(both occurrences, in the `model` input and `model` select branches)

Replace each with:
```tsx
                  className={`${fieldClass('model')} disabled:bg-gray-100 disabled:cursor-not-allowed`}
```

- [ ] **Step 7: Apply it to the `description` textarea**

Find the `description` textarea (originally around line 958-967) and replace its `className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"` with `className={fieldClass('description')}`.

- [ ] **Step 8: Verify visually**

With the dev server running, paste a sample listing text (e.g. `"Sprzedam BMW X5 2019, przebieg 85000 km, cesja leasingu, auto w bardzo dobrym stanie"`) into the smart-input box, wait for "Analizuję..." to finish, and confirm the `brand`/`model`/`year`/`mileage`/`description` fields now have an amber border. Then manually edit the `brand` field and confirm its amber border disappears immediately while the others stay amber.

- [ ] **Step 9: Run typecheck and build once more**

Run: `npm run typecheck` — expect the same pre-existing baseline only.
Run: `npm run build` — expect success.

- [ ] **Step 10: Commit**

```bash
git add src/components/AddListingPage.tsx
git commit -m "Mark AI-suggested fields visually until reviewed

Amber border + background on any field that analyze-listing-input
filled in, clearing the moment the seller edits that specific field -
makes it obvious which values are a suggestion to double-check versus
something the seller typed themselves."
```

---

### Task 5: Deploy the edge function and verify the full flow end-to-end

**Files:** none (deployment + verification only)

- [ ] **Step 1: Deploy the edge function**

This requires Supabase CLI access to the `nuvafrdwxbzxyowrtnxp` project, which this environment does not have (see Global Constraints). **Stop here and ask the user to run:**

```bash
supabase functions deploy analyze-listing-input
```

(or, if they don't have the CLI linked, ask Bolt.new to deploy it — Bolt has demonstrated direct access to this project's edge functions and database this session).

Do not proceed to Step 2 until this is confirmed deployed.

- [ ] **Step 2: Smoke-test the deployed function directly**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo
set -a; source .env; set +a
curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/analyze-listing-input" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Sprzedam BMW X5 2019, przebieg 85000 km, cesja leasingu, auto w bardzo dobrym stanie, pełne wyposażenie"}'
```

Expected: HTTP 200, JSON body with `"brand":"BMW"`, `"model"` containing `"X5"`, `"year":2019`, `"mileage":85000`, non-null `"description"`.

- [ ] **Step 3: Smoke-test the Facebook-URL fallback path**

```bash
curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/analyze-listing-input" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "https://www.facebook.com/marketplace/item/123456789"}'
```

Expected: HTTP 200, `{"needsManualPaste":true, ...}` (Facebook requires login, so the fetch should fail and trigger the fallback — this is the expected/correct behavior, not a bug).

- [ ] **Step 4: Smoke-test the disallowed-domain path**

```bash
curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/analyze-listing-input" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "https://example.com/some-listing"}'
```

Expected: HTTP 200, `{"needsManualPaste":true, ...}` immediately (no fetch attempt for a non-allow-listed domain).

- [ ] **Step 5: Full manual UI walkthrough**

Using the dev server (or the deployed site if this plan is being executed against a branch that's live), while logged in on `/add`:
1. Paste the sample BMW text from Step 2 into the smart-input box → confirm brand/model/year/mileage/description populate with amber borders within ~2 seconds of pausing typing.
2. Manually change the `brand` field → confirm its amber border clears and the value doesn't get overwritten by a later analysis run.
3. Clear the smart-input box, paste a Facebook URL → confirm the "Nie udało się pobrać..." message appears.
4. Upload a real vehicle photo → confirm analysis re-runs (a second "Analizuję..." flash) and any newly-suggested empty fields populate.
5. Fill in the remaining required fields (lease terms, at least one photo) and submit the listing → confirm it saves successfully, matching pre-existing form submission behavior (unchanged by this plan).

- [ ] **Step 6: Final commit (if anything changed during verification)**

If Steps 1-5 required no code changes, there is nothing to commit here — this task is verification-only. If any fix was needed, commit it with a message describing what verification step it fixes.
