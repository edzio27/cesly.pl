# UX/UI polish pass + two new homepage sections

## Goal

Go through the full user-facing path (homepage → listing detail, plus nav/footer
site-wide) and fix spacing/hierarchy/consistency issues left over from the recent
rebrand, then add two new homepage sections that address gaps in the current
funnel: explaining an unfamiliar transaction type, and speaking to sellers (not
just buyers).

Purely frontend (Tailwind classes + copy). No new database tables, no backend
changes, no fabricated content (no fake testimonials/reviews - we don't have
real ones yet).

Branch: `feature/ux-polish`, off `main`. Not merged until reviewed.

## Scope

### 1. Listing detail page polish (`src/components/ListingDetailPage.tsx`)

- Main content card uses `rounded-lg`; the rest of the rebranded site uses the
  custom `rounded-xl`/`rounded-2xl` scale. Align it.
- "Kontakt" and "Napisz wiadomość" currently render as two stacked `bg-gray-50`
  boxes with separate headers. Merge into one "Skontaktuj się ze sprzedającym"
  card, styled consistently with the "Parametry finansowe" card's header
  treatment, so the contact actions read as one coherent block instead of two
  unrelated ones.
- Thumbnail gallery: strengthen the active-thumbnail state (ring in brand
  amber, currently a thin border) and tighten the grid gap to match the spacing
  scale used elsewhere (`gap-2` → `gap-3` for touch-target breathing room).
- Modernize legacy `bg-opacity-75`/`bg-opacity-50` utility syntax to the
  `bg-white/75` slash syntax used everywhere else in the rebranded components,
  for consistency (behavior-identical, purely a syntax cleanup encountered
  while already touching these lines).

### 2. Homepage polish (`src/components/HomePage.tsx`)

- "Sortowanie" is currently only reachable by expanding "Pokaż zaawansowane
  filtry", despite being one of the most commonly used controls on a listings
  page. Pull it out as its own visible `<select>` next to the results count
  line ("X-Y z Z ofert"), remove it from the advanced-filters block.
- Tighten vertical rhythm between the three stacked bottom sections ("Czym jest
  cesja leasingu", "Popularne wyszukiwania", FAQ) - currently `space-y-12`,
  which is inconsistent with the tighter spacing used higher up the page.

### 3. Footer polish (`src/components/Footer.tsx`)

- Currently three plain columns (brand blurb, Informacje, Kontakt). Add a
  fourth "Popularne kategorie" column linking to pre-filtered searches
  (samochody / motocykle / łodzie), reusing the same `onNavigate` +
  query-param pattern already used by "Popularne wyszukiwania" on the
  homepage. Gives the footer real utility instead of being purely legal links.

### 4. New section: "Jak to działa" (`src/components/HomePage.tsx`)

Placed directly after the hero section, before the search filters. A 4-step
horizontal (stacked on mobile) process explainer:

1. **Znajdź ofertę** - przeglądaj aktywne ogłoszenia cesji leasingu
2. **Skontaktuj się** - napisz do właściciela przez wiadomości w serwisie
3. **Uzgodnij warunki** - z obecnym leasingobiorcą i leasingodawcą
4. **Podpisz cesję** - leasingodawca zatwierdza, umowa przechodzi na Ciebie

Each step: numbered circle badge (brand amber), short bold label, one-line
description - visually consistent with the existing trust-card treatment
(icon-in-circle + heading + short copy) so it doesn't introduce a new visual
language.

Rationale: cesja leasingu is not a transaction most visitors already
understand. A process explainer up top reduces the "wait, how does this even
work" hesitation before someone starts browsing listings - one of the highest-
leverage additions for a marketplace dealing in an unfamiliar transaction type.

### 5. New section: seller CTA banner (`src/components/HomePage.tsx`)

Placed near the bottom of the page, after the FAQ section, before the footer.
A full-width navy band (matching the hero's `brand-navy` treatment) with:

- Headline: "Chcesz oddać leasing?"
- Subline: "Dodaj ogłoszenie za darmo w kilka minut i znajdź kogoś, kto przejmie Twoje raty."
- Button: "Dodaj ogłoszenie za darmo" → same handler as the nav CTA (opens
  auth modal if logged out, navigates to add-listing if logged in).

Rationale: today the only seller-facing CTA is the small button in the nav
bar. The rest of the homepage copy speaks entirely to buyers ("Największa
oferta", "Znajdź ofertę"). A dedicated banner represents the supply side of
the marketplace, which matters equally for the site to keep growing.

## Out of scope

- Any new database tables, columns, or backend/edge-function changes.
- Fabricated social proof (testimonials, review counts) - not adding until
  there's real content to show.
- The interactive-feature ideas discussed and declined (calculator, quiz).
