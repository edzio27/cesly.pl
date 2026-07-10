# Cesly.pl visual rebrand — "C" logo + navy accent + hero illustration

## Motivation

The user generated an AI mockup they liked: a navy circular badge with a white "C" mark, a "Cesly.PL" wordmark, over a hero-style photo (car + city skyline). They want to adopt the "C" mark as the new logo, shift the site's dominant visual tone toward navy, and add a more "alive" hero section — following on from the entrance-animation/carousel work already shipped this session.

We cannot reproduce the pasted image directly (no file access to it, no AI image-generation tool available), so the icon is recreated as a hand-built SVG and the hero background is a stylized illustration rather than a photo.

## Color system

Two new brand tokens added to `tailwind.config.js`:

- `brand-navy` — `#0E1023`. Dark surface color for the nav bar, hero section, and footer. This value already exists as the background color baked into the current logo PNG assets (`public/cesly_logo_cropped_big.png`), so it's not a new invention — just promoted to a reusable token.
- `brand-blue` — `#2453C4`. Used only for the "C" logo circle itself and minor accents next to it.

Amber (`amber-500`/`amber-600`, Tailwind defaults) remains unchanged as the action/CTA color: buttons, price highlights, "SUPER OKAZJA" badges, star ratings, and the listing-card hover glow added earlier this session. No amber usage is touched by this change.

**Scope boundary:** only the nav bar, hero section, footer, logo, and favicon/avatar shift to navy. The listing grid, cards, filters, carousel, and FAQ sections keep their current light backgrounds and amber accents unchanged.

## Logo

`src/components/Logo.tsx` changes from an `<img>` tag pointing at a static PNG to an inline SVG component: a `brand-blue` (`#2453C4`) filled circle with a white "C" glyph centered inside, matching the style of the reference image. The "Cesly.pl" wordmark text stays as-is (no change requested there).

This SVG becomes the single source for:
- Navigation bar logo
- Homepage hero logo
- Favicon (`index.html` + new SVG/PNG favicon files in `public/`)
- A new Facebook avatar export (`~/Downloads/cesly_avatar_c.png`), replacing the two-arrows avatar generated earlier this session

## Hero section (HomePage.tsx)

The hero section background changes from the current light gray/amber gradient to a `brand-navy` gradient background. A subtle, low-contrast SVG city-skyline silhouette sits near the bottom of the section — flat geometric building shapes, not a photo — plus a soft amber/blue glow (reusing the existing blurred-blob decoration pattern, recolored). Headline text, stat counters (+120 ofert / +500 użytkowników), and the "C" logo render in white/light colors for contrast against the dark background.

The panorama is deliberately subtle per user preference (background texture, not a dominant visual element) — thin building silhouettes, heavily muted opacity, positioned low in the section so it doesn't compete with the headline or the animated counters already implemented.

The filter/search panel directly below the hero stays a light card (unchanged), preserving form readability.

## Navigation bar

`src/components/Navigation.tsx` background switches from `bg-gradient-to-b from-gray-50/95 to-white/95` to a `brand-navy`-based background. Nav link text and icons switch from dark-on-light to light-on-dark equivalents. The mobile menu panel gets the same treatment. Hover/active states keep using amber where they already do (matches existing interactive-color convention across the site).

## Footer

`src/components/Footer.tsx` currently uses Tailwind's generic `bg-gray-900`. This changes to the exact `brand-navy` (`#0E1023`) value so the footer, nav, and hero all share the identical dark tone instead of three visually-close-but-not-identical darks.

## Out of scope

- No change to listing cards, filters, carousel, FAQ, or any amber-colored element.
- No change to legal pages (Regulamin/Polityka Prywatności) styling beyond whatever inherits from Footer/Navigation.
- No photo-realistic imagery anywhere (per user decision, hero uses an illustrated background instead).
- No email/messaging copy changes.

## Verification

Since this is a purely visual change with no new data flows, verification is browser-based: start the dev preview, check the new nav/hero/footer render correctly at desktop and mobile widths, confirm no contrast/readability regressions (text legible on navy backgrounds), confirm existing amber-based UI (buttons, cards, carousel) is visually untouched, and confirm `npm run typecheck` shows no new errors beyond the existing baseline.
