# Cesly.pl full rebrand v2 — Looka brand kit (arrow logo + full color system + Urbanist)

## Motivation

The user generated a complete brand kit via Looka (logo concepts, an exact color palette with hex values, font recommendation, and ready-to-paste CSS custom properties) and wants the site rebuilt to match it. This **supersedes** the same-day earlier "C" logo / navy rebrand already on this branch (`worktree-cesly-rebrand`) — that work is not wasted (the branch structure, the `Logo` component pattern, the anti-aliased PNG generation technique, and the brand-token approach in `tailwind.config.js` are all reused), but its specific colors and logo are replaced by this spec's values.

Chosen logo: `Logo - Blue Gradient.png` — a square lockup (gradient blue background, an upward-curving road/arrow swoosh icon, "cesly.pl" wordmark, "cesje i najmy" tagline). The other three logo concepts in the provided kit (`Dark Modern`, `Light Clean`, and mockup `4.png`) are not used — `Light Clean` and `4.png` both have visible AI-generation text-rendering glitches (duplicated/overlapping letterforms) and are unusable regardless.

## Source brand guide (verbatim from the provided brand kit image)

**Colors:**
| Name | Hex |
|---|---|
| Primary Blue | `#2563EB` |
| Navy Dark (Secondary) | `#0F172A` |
| Accent Cyan | `#22D3EE` |
| Background | `#F8FAFC` |
| Success | `#16A34A` |
| Warning | `#FACC15` |

**Fonts:** Urbanist 700 for headings, Urbanist 400–600 for body text. Alternative suggested: Inter / Manrope (not used — going with the primary recommendation, Urbanist).

**Other tokens:** `--radius: 10px`.

## Key technical decision: redefine Tailwind's color scales, don't touch call sites

A codebase-wide audit (see session notes) found **~135 `amber-*`, ~16 `orange-*`, ~394 `gray-*`, and ~9 `emerald-*` class occurrences across roughly 20 files** in `src/`. Editing every call site individually would be slow and risks silently missing instances.

Instead, every one of the brand guide's hex values turns out to be an exact **stock Tailwind default color** from a *different* color family than the one currently used in the codebase:

- `#2563EB` = Tailwind's `blue-600` (already Tailwind's default — no override needed to use it as-is via `blue-*` classes, but we alias it as `brand-blue` for the logo/token convenience already established this session)
- `#0F172A` = Tailwind's `slate-900`
- `#22D3EE` = Tailwind's `cyan-400`
- `#F8FAFC` = Tailwind's `slate-50`
- `#16A34A` = Tailwind's `green-600` (the codebase's existing plain `green-*` usages already resolve to this exact value today — zero changes needed there)
- `#FACC15` = Tailwind's `yellow-400`

This means the rebrand can be implemented almost entirely in `tailwind.config.js` by **overriding what the existing color-family names resolve to**, so every existing `bg-gray-900`, `text-gray-600`, `bg-amber-500`, `from-amber-500 to-orange-500`, `text-emerald-600`, etc. across all ~20 files picks up the new brand color automatically, with no per-component edits for the base recolor:

- `gray` → redefined to Tailwind's `slate` scale (so `gray-900` becomes exactly `#0F172A`, the brand's Navy Dark; `gray-50` becomes `#F8FAFC`, the brand Background)
- `amber` → redefined to a custom scale built by shifting Tailwind's `yellow` scale one step, so that `amber-500` (the shade the codebase uses most for solid CTA buttons/badges) lands exactly on `#FACC15` (brand Warning/gold), and `amber-600` becomes the next `yellow` step down for hover-darkening — preserves the existing "hover:bg-amber-600 is darker than bg-amber-500" pattern used throughout
- `orange` → redefined to a custom deeper-gold scale (reusing the *old* pre-rebrand amber scale's values, shifted) so existing `from-amber-500 to-orange-500` gradients read as "bright gold → deep gold" rather than jumping to a clashing true orange hue (the brand guide doesn't define an orange at all — this is a judgment call to keep gradients coherent with the new gold accent)
- `emerald` → redefined to Tailwind's `green` scale (aligns the deal-score "positive" color with the brand's Success green; plain `green-*` classes elsewhere already match and are untouched)

**Only two files have a hardcoded hex instead of a Tailwind class** (found during the audit) and need manual edits regardless of the config-override strategy: `src/components/Logo.tsx` (inline SVG `fill="#2453C4"`) and `public/favicon.svg` (same value) — both currently hold the *old* rebrand's blue and both are being replaced with new logo artwork anyway as part of this spec.

**Border radius:** no arbitrary radius values exist anywhere in the codebase (confirmed by audit) — usage is 100% the standard Tailwind scale (`rounded-lg` ×86, `rounded-full` ×47, `rounded-md` ×24, `rounded-xl` ×13, `rounded-2xl` ×4). `theme.extend.borderRadius` will map `lg` → `10px` (landing the brand's `--radius: 10px` exactly on the most-used utility), with `md`/`xl`/`2xl` adjusted proportionally around it. `rounded-full` and bare `rounded` are untouched (pills/circles and minor default-radius elements aren't part of the brand guide's callout).

**Font:** no existing font customization anywhere in the codebase (confirmed by audit) — this is a pure addition, not an override. Urbanist loads via a Google Fonts `<link>` in `index.html`, and `theme.extend.fontFamily.sans` is set to `['Urbanist', ...]` so it becomes the site's default body/heading font with zero per-component edits (existing `font-bold`/`font-semibold` weight utilities already used throughout naturally satisfy the guide's "700 for headings, 400–600 for text" without further changes).

## Logo

The chosen "Blue Gradient" lockup bakes the wordmark text into the image itself, which doesn't scale down to a 40px nav icon legibly (same problem solved earlier today for the previous logo). Per the user's decision:

- **Small/icon placements** (nav bar, favicon, PWA icons): a hand-recreated inline SVG of just the arrow/swoosh mark (not the square gradient background, not the baked-in text) — a smooth upward-curving path with an arrowhead, filled with a blue gradient (`#2563EB` → `#22D3EE`, matching the kit's "blue gradient" concept and giving the cyan accent color a real use). Displayed next to a separate `<span>Cesly.pl</span>` text element, exactly the pattern already established for the nav bar and hero this session.
- **Large placements** (Facebook avatar, and as a design reference for the OG image / Facebook cover art): the user's own `Logo - Blue Gradient.png` file is usable as-is (it's a clean, complete 500×500 square lockup with no rendering glitches) — resized up via LANCZOS for the 900×900 avatar rather than hand-recreated from scratch.
- The homepage hero keeps the icon + "Cesly.pl" + tagline arrangement from the earlier rebrand, just recolored.

## Scope: what changes, what doesn't

**Changes (via the config-override strategy — no component edits required for these):**
- Every `gray-*`, `amber-*`, `orange-*`, `emerald-*` Tailwind class across the whole app picks up new brand hex values automatically.
- Body font becomes Urbanist everywhere.
- `rounded-lg` (and the related scale) becomes the brand's 10px radius everywhere.

**Changes (manual edits required):**
- `tailwind.config.js` — color scale overrides, font family, border radius, updated `brand-navy`/`brand-blue` token values
- `index.html` — Google Fonts `<link>` for Urbanist, updated `theme-color` meta (to `#0F172A`), OG/Twitter/JSON-LD image references updated to the new share image
- `src/components/Logo.tsx` — new arrow-icon SVG (gradient fill) replacing the "C" mark
- `public/favicon.svg` — same new arrow icon
- `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png` — regenerated with the new icon + colors
- `public/og-image.png` — regenerated with new colors/icon (same 1200×630 approach as before)
- `public/manifest.json` — `theme_color` updated to `#0F172A`
- `supabase/functions/sitemap/index.ts` — image sitemap reference updated to the new og-image
- New Facebook avatar (`~/Downloads/cesly_avatar_c.png` gets replaced/renamed, or a new filename — final naming decided at plan time) using the user's own Blue Gradient PNG, resized
- New Facebook cover image, redesigned with the new colors and icon

**Explicitly out of scope (per the "no per-call-site edits" strategy already covering it):** every individual component file (`ListingCard.tsx`, `HomePage.tsx`, `AddListingPage.tsx`, `AnalyticsPage.tsx`, `Navigation.tsx`, `Footer.tsx`, `ListingDetailPage.tsx`, `dealScore.ts`, and all the rest) needs **no direct edits** for the color/font/radius change — the whole point of the strategy above is that these files are untouched and simply inherit the new brand tokens through the Tailwind config. `Navigation.tsx`/`HomePage.tsx`/`Footer.tsx` *do* need small edits only where they reference `brand-navy`/`brand-blue` directly or render the `Logo` component (already true from the earlier rebrand — those references keep working, just resolving to new hex values), and `Navigation.tsx`/`HomePage.tsx` specifically to swap the `Logo` component's internals (handled inside `Logo.tsx`, not the callers).

## Verification

No automated test suite exists in this repo (confirmed throughout this session). Verification is: `npm run typecheck` (baseline-only errors), `npm run build` (succeeds), and a full manual browser sweep — homepage (desktop + mobile), nav bar, hero, listing cards (color + badges + hover), filters, carousel, FAQ, footer, a listing detail page, and the add-listing form — checking that colors/font/radius changed consistently everywhere and nothing broke, plus a zoomed screenshot check that no new PNG asset has jagged/aliased edges (the anti-aliasing technique from the earlier fix must be reused for every regenerated PNG).
