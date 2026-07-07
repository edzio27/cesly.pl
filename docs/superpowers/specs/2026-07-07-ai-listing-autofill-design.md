# AI-assisted listing autofill (design)

Date: 2026-07-07
Status: Approved by user, ready for implementation planning

## Context / motivation

The current "Dodaj ogłoszenie" form (`src/components/AddListingPage.tsx`) has 17
fields and feels tedious to fill out. The user asked whether we could copy
Otomoto's "add photos or VIN, we do the rest" flow.

The project already has two relevant pieces in place:
- An `ANTHROPIC_API_KEY` secret configured in Supabase, already used by the
  `estimate-car-value` edge function to call Claude (`claude-haiku-4-5`) for
  market-value estimation.
- A "paste a Facebook post" importer (`fbUrl`/`fbText` state, calls the
  `parse-facebook-post` edge function) that regex-matches specific Polish
  phrasings ("marka: X", "rok: Y") out of pasted text. The user describes it as
  unreliable ("średnio działało").

## Goals

- Reduce how much the seller has to type by hand when creating a listing.
- Reuse the existing Anthropic API access rather than adding a new provider.
- Replace the brittle regex-based Facebook text parser with real language
  understanding (Claude), fixing the "works so-so" complaint.
- Let the seller paste a link to an existing listing (Otomoto, OLX, Gratka, or
  Facebook) instead of only raw text.
- Auto-fill only fields that can genuinely be inferred from text/photos; never
  guess at data nobody but the seller could know.

## Non-goals (explicitly considered and dropped during design)

- **VIN decoding.** Rejected: the fields that a VIN would help fill (brand,
  model, year) are things a seller already knows instantly. A VIN lookup would
  add friction (seller has to go find their registration document) for a
  field that's faster to just type. Also would have required a third-party VIN
  decoder API with uncertain accuracy for European-market vehicles.
- **Auto-filling lease/financial terms** (rata miesięczna, odstępne, cena
  wykupu, pozostałe/wszystkie raty). These are terms of the seller's own
  leasing contract — no photo, VIN, or listing text can know them. They stay
  manual, unchanged from today's form.
- **Blind auto-submit.** Every AI-suggested value is shown in an editable
  field the seller can review/correct before submitting — never submitted
  without the seller seeing it.
- **Automated tests.** This project has no test runner configured (confirmed
  earlier this session — `npm run typecheck`/`build` are the only checks).
  Verification is manual/live, matching how every other feature in this repo
  has been verified this session.

## UX flow

At the top of the form (above the existing fields, replacing the current
Facebook-only import box):

1. One input: **"Wklej link do ogłoszenia (Otomoto, OLX, Gratka, Facebook) lub
   treść ogłoszenia"** — a single textarea/input that accepts either a URL or
   free text.
2. Photo upload sits next to/near it (existing upload UI, moved up from the
   bottom of the form to be adjacent to this box).
3. Trigger is automatic, no button:
   - Text: fires ~1.5s after the user stops typing/pasting (debounced).
   - Photos: fires as soon as an upload batch finishes.
4. While analysis runs, show a small non-blocking indicator ("Analizuję…").
5. Results are merged into `formData`, filling **only fields that are still
   empty** — never overwrites something the seller already typed.
6. Fields that got auto-filled get a visible marker (amber border + small
   "sprawdź" label) that clears the moment the seller edits that field.
7. Everything else (lease terms, contact info, all manual fields today) is
   unchanged.

### Link handling specifically

- If the pasted value matches a URL from an allow-listed domain
  (`otomoto.pl`, `olx.pl`, `gratka.pl`, `facebook.com`), the edge function
  attempts to fetch and read the page server-side.
- Otomoto/OLX/Gratka are public pages with no login wall, so this should work
  directly in most cases.
- Facebook requires login for most content, so the fetch will often fail (by
  design, not a bug to chase). On failure — or for any other URL — the
  frontend shows: *"Nie udało się pobrać tej strony (częste dla Facebooka) —
  wklej treść ogłoszenia ręcznie poniżej"* and reveals a plain textarea. That
  pasted text still goes through Claude, same as any other pasted text — this
  is strictly better than today's regex fallback.
- A URL from a domain not on the allow-list gets the same "wklej treść
  ręcznie" message rather than an attempted fetch.

## Technical design

### New edge function: `analyze-listing-input`

Replaces `parse-facebook-post`.

**Request:** `{ text?: string, imageUrls?: string[] }`

**Behavior:**
1. If `text` is present and matches an allow-listed domain URL pattern, try
   `fetch(url)`. On success, strip tags from the returned HTML to get raw
   text (simple regex-based stripping, no DOM parser dependency — Claude is
   expected to handle noisy/leftover markup fine). On failure or disallowed
   domain, return `{ needsManualPaste: true }` immediately without calling
   Claude.
2. If `text` is present and is not a URL, use it as-is.
3. If `imageUrls` is present, fetch each image (already-uploaded Supabase
   Storage URLs) and include it as an image content block in the Claude
   request.
4. Single call to `https://api.anthropic.com/v1/messages` using the same
   `ANTHROPIC_API_KEY` secret and header pattern as `estimate-car-value`.
   Prompt asks for a strict JSON object back:
   `{ brand, model, year, mileage, vehicleType, description }`, with `null`
   for anything that can't be determined. Fields not in the current
   `listings` schema are not requested (no engine/trim/fuel-type — those
   aren't exposed in the add-listing form today).
5. Parse the JSON response defensively: on any parse failure, return an
   all-null result rather than erroring.

**Response:** `{ brand: string|null, model: string|null, year: number|null,
mileage: number|null, vehicleType: string|null, description: string|null,
needsManualPaste?: true }`

### Frontend changes (`AddListingPage.tsx`)

- Remove `fbUrl`, `parsingFb`, `fbError`, and the old fetch to
  `parse-facebook-post`. Keep a single `smartInput` (text/URL) state and
  `showTextInput`/`needsManualPaste` state for the fallback textarea.
- Move the photo upload section up, adjacent to the new smart-input box.
- Debounce logic (text) and post-upload trigger (photos) both call
  `analyze-listing-input` with whatever combination of text/imageUrls is
  currently available, then merge results into `formData` per the "only fill
  empty fields" rule above.
- Track which field keys were AI-filled (a `Set<string>` or similar) purely
  for the visual marker; clear a key from that set the moment its `onChange`
  fires.

### Error handling

All failure paths degrade silently to "nothing gets auto-filled, form works
exactly like it does today":
- Missing `ANTHROPIC_API_KEY` (same pattern already used in
  `estimate-car-value`).
- Network/timeout fetching the listing URL or the images.
- Claude API error or unparseable response.
- No spinner/error state blocks form submission at any point — the seller can
  always just fill fields by hand as they can today.

## Testing / verification plan

No automated tests (none exist in this project). Manual verification once
implemented, mirroring how prior features this session were verified:
1. Paste a realistic OLX/Otomoto-style listing text → confirm brand/model/
   year/mileage/description populate.
2. Paste a Facebook URL → confirm graceful fallback to manual textarea.
3. Upload a photo of a car (and ideally a dashboard/odometer photo) → confirm
   mileage/description get suggested where visible.
4. Manually type a value into a field before analysis finishes → confirm the
   AI result does not overwrite it.
5. Confirm `npm run build` and `npm run typecheck` show no new errors beyond
   the pre-existing baseline.
