# Cesly.pl "C" Logo / Navy Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cesly.pl's two-arrows logo with a navy/blue "C" mark, restyle the navigation bar, homepage hero, and footer to a navy brand color while leaving amber (buttons, badges, cards, carousel, FAQ) untouched, and regenerate favicon/PWA icons and the Facebook avatar to match.

**Architecture:** The "C" mark is authored once as inline SVG path/circle geometry (a stroked arc forming the letterform) and reused in three forms: a React `<Logo>` component (nav + hero), a static `public/favicon.svg` file (browser tab icon), and PNG raster exports produced with Pillow using an equivalent ring+wedge-cut technique (apple-touch-icon, PWA icons, Facebook avatar). Two new Tailwind color tokens (`brand-navy`, `brand-blue`) back every navy-colored surface so the exact hex only needs to be defined once.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS (config-based token extension), Vite dev server for visual verification via the project's `Claude_Preview` MCP tooling, Python 3 + Pillow for PNG icon generation (already available and proven in this environment — used earlier this session for the Facebook avatar export).

## Global Constraints

- `brand-navy` = `#0E1023` (already the background color baked into the existing logo PNGs; reused, not invented).
- `brand-blue` = `#2453C4` (logo circle color, matches the user's reference mockup).
- Amber (`amber-400`/`500`/`600`, Tailwind defaults) must not change anywhere: buttons, price highlights, "SUPER OKAZJA" badges, star ratings, listing-card hover glow, filter chips.
- Only these surfaces become navy: navigation bar, homepage hero band, footer, logo, favicon/PWA icons, Facebook avatar. No other component's background or text color changes.
- This repo has no automated test runner (no jest/vitest config, no `*.test.tsx` files anywhere in `src/`). All verification in this plan is manual browser verification via the `Claude_Preview` MCP tools (`preview_start`, `preview_screenshot`, `preview_console_logs`, `preview_inspect`), matching how every other UI change in this project has been verified this session. Do not introduce a test framework as part of this plan — out of scope.
- Run `npm run typecheck` after each task that touches a `.tsx` file; the only acceptable errors are the pre-existing baseline (unused-import warnings in untouched files, two `Page`-type errors in `App.tsx`). Any other new error must be fixed before committing.

---

### Task 1: Add brand color tokens to Tailwind config

**Files:**
- Modify: `tailwind.config.js`

**Interfaces:**
- Produces: Tailwind utility classes `bg-brand-navy`, `text-brand-navy`, `border-brand-navy`, `bg-brand-blue`, `text-brand-blue`, etc. — consumed by Tasks 2-5.

- [ ] **Step 1: Add the two color tokens**

Current file (after the earlier `fade-in-up` animation addition):

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};
```

Change the `extend` block to also include a `colors` key:

```js
    extend: {
      colors: {
        'brand-navy': '#0E1023',
        'brand-blue': '#2453C4',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out both',
      },
    },
```

- [ ] **Step 2: Verify the tokens compile**

Run: `cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo && npm run build 2>&1 | tail -20`
Expected: build succeeds (no Tailwind config errors). This is a full build rather than the dev server because Tailwind only needs to parse the config file correctly here — no visual check is meaningful until a component actually uses the new classes (Task 3+).

- [ ] **Step 3: Commit**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo
git add tailwind.config.js
git commit -m "Add brand-navy and brand-blue Tailwind color tokens"
```

---

### Task 2: Rebuild Logo.tsx as an inline SVG "C" mark

**Files:**
- Modify: `src/components/Logo.tsx`

**Interfaces:**
- Consumes: nothing new (same props as before).
- Produces: `Logo({ size?: number; className?: string })` — a React component rendering an inline `<svg>` (not an `<img>`). Same prop names/types as the current component, so every existing call site keeps compiling. Consumed by Task 3 (Navigation) and Task 4 (HomePage hero).

- [ ] **Step 1: Replace the component body**

Current file:

```tsx
import React from 'react';

type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <img
      src="/cesly_logo_cropped_big.png"
      alt="Cesly.pl"
      className={className}
      style={{ height: size }}
    />
  );
}
```

Replace with:

```tsx
type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Cesly.pl"
    >
      <circle cx="20" cy="20" r="20" fill="#2453C4" />
      <path
        d="M 27.37 25.16 A 9 9 0 1 1 27.37 14.84"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

Note: the `import React from 'react'` line is dropped because this file no longer uses `React.*` directly and the project's `noUnusedLocals` TypeScript setting would otherwise flag it (JSX itself doesn't require the import under the modern `react-jsx` transform already used elsewhere in this codebase, e.g. `ListingCard.tsx` keeps its `React` import only because it references `React.MouseEvent` — this file has no such reference).

- [ ] **Step 2: Typecheck**

Run: `cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo && npx tsc --noEmit 2>&1 | grep -i "Logo.tsx"`
Expected: no output (no errors referencing `Logo.tsx`).

- [ ] **Step 3: Visual check — confirm the arc actually reads as a "C" and not a full ring or a backwards "C"**

Logo.tsx isn't imported anywhere yet at this point in the plan (Navigation.tsx still uses a raw `<img>` — that's fixed in Task 3), so render it via a temporary throwaway check: start the dev server, then use `preview_eval` to mount it ad hoc is overkill — instead, jump straight to Task 3's dev-server screenshot for the real visual check, since Task 3 wires `<Logo>` into `Navigation.tsx` immediately after this. Do not spend time on an isolated preview for this task; proceed to Task 3 and treat its screenshot step as verification for both tasks. If the arc renders as a closed ring (no visible gap) or the gap faces the wrong side, come back and adjust the `A 9 9 0 1 1 ...` sweep-flag (the second `1` before the endpoint coordinates) to `0` and re-check.

- [ ] **Step 4: Commit**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo
git add src/components/Logo.tsx
git commit -m "Rebuild Logo as inline SVG 'C' mark instead of PNG"
```

(This commit lands before visual confirmation from Task 3 — that's fine, Task 3 fixes forward with a follow-up commit if the arc needs adjusting.)

---

### Task 3: Wire the new Logo into Navigation.tsx and restyle the nav bar to navy

**Files:**
- Modify: `src/components/Navigation.tsx:5, 36, 43-48, 62-66, 119-122, 127`

**Interfaces:**
- Consumes: `Logo` from `./Logo` (already imported at line 5, currently unused — this task starts using it).

- [ ] **Step 1: Replace the raw `<img>` logo with `<Logo>`**

Current (lines 39-48):

```tsx
            <button
              onClick={() => handleNavigate('home')}
              className="flex items-center space-x-3 group"
            >
              <img
                src="/transparent.png"
                alt="Cesly.pl"
                className="h-10 transition-transform group-hover:scale-105 duration-300"
              />
            </button>
```

Replace with:

```tsx
            <button
              onClick={() => handleNavigate('home')}
              className="flex items-center space-x-3 group"
            >
              <Logo size={40} className="transition-transform group-hover:scale-105 duration-300" />
            </button>
```

- [ ] **Step 2: Restyle the nav bar background and text colors to navy**

Current (line 36):

```tsx
      <nav className="bg-gradient-to-b from-gray-50/95 to-white/95 backdrop-blur-md shadow-md sticky top-0 z-40 border-b border-gray-200">
```

Replace with:

```tsx
      <nav className="bg-brand-navy/95 backdrop-blur-md shadow-md sticky top-0 z-40 border-b border-white/10">
```

- [ ] **Step 3: Fix the "Moje konto" button and mobile menu button text color for the dark background**

Current (lines 60-66):

```tsx
                <button
                  onClick={() => user ? setShowDesktopMenu(!showDesktopMenu) : setShowAuthModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                >
                  <User size={20} />
                  <span className="font-medium">Moje konto</span>
                </button>
```

Replace `text-gray-700 hover:bg-gray-100` with `text-gray-200 hover:bg-white/10`:

```tsx
                <button
                  onClick={() => user ? setShowDesktopMenu(!showDesktopMenu) : setShowAuthModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-white/10 transition"
                >
                  <User size={20} />
                  <span className="font-medium">Moje konto</span>
                </button>
```

Current (lines 117-122), the mobile hamburger button:

```tsx
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
```

Replace with:

```tsx
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg text-gray-200 hover:bg-white/10 transition"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
```

- [ ] **Step 4: Restyle the mobile menu panel background**

Current (line 127):

```tsx
          <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md">
```

Replace with:

```tsx
          <div className="md:hidden border-t border-white/10 bg-brand-navy/95 backdrop-blur-md">
```

Leave the individual mobile menu item buttons (lines 131-200) untouched — their `text-gray-700 hover:bg-gray-100` styling sits on white dropdown panels (the desktop account dropdown at line 74 and the amber CTA buttons), not directly on the navy nav bar, so they read fine as-is. Only the mobile menu's own background (this step) and the two nav-bar-level buttons (Step 3) needed color changes.

- [ ] **Step 5: Typecheck**

Run: `cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo && npx tsc --noEmit 2>&1 | grep -i "Navigation.tsx"`
Expected: no output.

- [ ] **Step 6: Visual verification in the browser**

Use the `Claude_Preview` MCP tools:
1. `preview_start` with the `cesly-dev` launch config (already defined in `.claude/launch.json`).
2. `preview_screenshot` — confirm: nav bar is navy, "C" logo renders as a filled blue circle with a visible white "C" gap facing right (not a closed ring, not facing left), "Dodaj ogłoszenie za darmo" button is still amber/orange gradient (unchanged), "Moje konto" text is readable (light gray on navy).
3. `preview_resize` to `mobile` preset, click the hamburger icon via `preview_click`, `preview_screenshot` — confirm mobile menu panel is navy and readable.
4. `preview_console_logs` with `level: "error"` — confirm no new errors.

If the "C" gap faces the wrong way or looks like a closed ring, go back to `Logo.tsx` and flip the arc's sweep-flag as described in Task 2 Step 3, then re-screenshot.

- [ ] **Step 7: Commit**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo
git add src/components/Navigation.tsx src/components/Logo.tsx
git commit -m "Wire new SVG logo into nav bar and restyle nav to navy"
```

(Logo.tsx is included here too in case Step 6 required an arc adjustment.)

---

### Task 4: Redesign the HomePage hero section (navy band + skyline silhouette)

**Files:**
- Modify: `src/components/HomePage.tsx:1-6` (imports), `src/components/HomePage.tsx:370-403` (hero JSX block)

**Interfaces:**
- Consumes: `Logo` component (Task 2/3), `AnimatedCounter` (already defined earlier in this file from prior session work), `TrendingUp`/`Users` icons (already imported from `lucide-react`).

- [ ] **Step 1: Import Logo**

Current top of file:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Star, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, TrendingUp, Shield, Users, Check, Bookmark } from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { ListingCard } from './ListingCard';
import { FeaturedCarousel } from './FeaturedCarousel';
import { calculateDealScore } from '../utils/dealScore';
import { trackPageView } from '../utils/analytics';
import { useAuth } from '../contexts/AuthContext';
```

Add a `Logo` import after the `FeaturedCarousel` import:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Star, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, TrendingUp, Shield, Users, Check, Bookmark } from 'lucide-react';
import { supabase, Listing } from '../lib/supabase';
import { ListingCard } from './ListingCard';
import { FeaturedCarousel } from './FeaturedCarousel';
import { Logo } from './Logo';
import { calculateDealScore } from '../utils/dealScore';
import { trackPageView } from '../utils/analytics';
import { useAuth } from '../contexts/AuthContext';
```

- [ ] **Step 2: Replace the hero block**

Find this exact block (currently lines 370-403 — confirm by locating the `return (` that starts the component's JSX, immediately followed by the outer `min-h-screen` div):

```tsx
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30">
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            <img
              src="/cesly_logo_fixed.png"
              alt="Cesly.pl"
              className="h-16 md:h-20 mx-auto"
            />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Największa baza cesji leasingów w Polsce
            </h1>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <span className="font-semibold"><AnimatedCounter target={120} prefix="+" /> aktywnych ogłoszeń</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <span className="font-semibold"><AnimatedCounter target={500} prefix="+" /> użytkowników</span>
              </div>
            </div>
          </div>
        </div>

```

Replace it with (this moves the hero content into its own full-bleed `<section>` before the existing light-background container, and keeps the light-background container open for everything from the "Compact strip on mobile" comment onward — do not touch anything after this block):

```tsx
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30">
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-100/20 rounded-full blur-3xl"></div>
      </div>

      <section className="relative overflow-hidden bg-gradient-to-b from-brand-navy to-[#070811]">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-blue/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <svg
          className="absolute inset-x-0 bottom-0 w-full h-24 md:h-32 text-white/[0.06]"
          viewBox="0 0 1200 160"
          preserveAspectRatio="none"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect x="20" y="70" width="60" height="90" />
          <rect x="100" y="40" width="50" height="120" />
          <rect x="170" y="90" width="45" height="70" />
          <rect x="240" y="20" width="55" height="140" />
          <rect x="320" y="60" width="60" height="100" />
          <rect x="410" y="35" width="50" height="125" />
          <rect x="480" y="80" width="40" height="80" />
          <rect x="540" y="10" width="65" height="150" />
          <rect x="630" y="55" width="55" height="105" />
          <rect x="710" y="30" width="50" height="130" />
          <rect x="780" y="85" width="45" height="75" />
          <rect x="850" y="45" width="60" height="115" />
          <rect x="930" y="65" width="50" height="95" />
          <rect x="1000" y="25" width="55" height="135" />
          <rect x="1080" y="75" width="45" height="85" />
          <rect x="1140" y="50" width="50" height="110" />
        </svg>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 text-center">
          <div className="inline-block mb-4">
            <Logo size={72} className="mx-auto" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Największa baza cesji leasingów w Polsce
            </h1>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-white"><AnimatedCounter target={120} prefix="+" /> aktywnych ogłoszeń</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-white"><AnimatedCounter target={500} prefix="+" /> użytkowników</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

```

Everything from `{/* Compact strip on mobile so search + listings aren't pushed below the fold */}` onward in the original file is unchanged and now sits inside this freshly-reopened `<div className="relative max-w-7xl ...">`.

- [ ] **Step 3: Typecheck**

Run: `cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo && npx tsc --noEmit 2>&1 | grep -i "HomePage.tsx"`
Expected: no output.

- [ ] **Step 4: Visual verification**

1. `preview_start` (reuse `cesly-dev` if already running, otherwise start it).
2. `preview_eval`: `window.location.reload()`.
3. `preview_screenshot` — confirm: full-width navy band at the top containing the "C" logo, white headline text, animated counters in white/amber, a faint skyline silhouette near the bottom edge of the navy band. Below the navy band, the page returns to its previous light background (trust cards, filter panel) — confirm there's a clean, deliberate edge between navy and light, not an accidental gap or overlap.
4. `preview_resize` to `mobile` — confirm the hero band still reads well narrow (headline wraps acceptably, counters don't overflow).
5. `preview_console_logs` `level: "error"` — confirm no new errors.
6. Scroll down past the hero and confirm the listing grid, carousel, and FAQ sections are visually untouched (still light background, amber accents) — this is the key regression check for the spec's scope boundary.

- [ ] **Step 5: Commit**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo
git add src/components/HomePage.tsx
git commit -m "Redesign homepage hero as a navy band with C logo and skyline silhouette"
```

---

### Task 5: Align Footer.tsx to the exact brand-navy value

**Files:**
- Modify: `src/components/Footer.tsx:14, 54`

**Interfaces:**
- None (isolated color-token swap).

- [ ] **Step 1: Swap `bg-gray-900` for `bg-brand-navy`**

Current (line 14):

```tsx
    <footer className="bg-gray-900 text-gray-300 mt-16">
```

Replace with:

```tsx
    <footer className="bg-brand-navy text-gray-300 mt-16">
```

- [ ] **Step 2: Swap the bottom bar's border/divider color to match**

Current (line 54):

```tsx
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
```

Replace with:

```tsx
      <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo && npx tsc --noEmit 2>&1 | grep -i "Footer.tsx"`
Expected: no output.

- [ ] **Step 4: Visual verification**

`preview_eval` to scroll to the bottom of the homepage, `preview_screenshot` — confirm the footer's navy now visually matches the hero band and nav bar exactly (same shade, no visible seam/mismatch between the three).

- [ ] **Step 5: Commit**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo
git add src/components/Footer.tsx
git commit -m "Align footer background to exact brand-navy value"
```

---

### Task 6: Regenerate favicon.svg, PWA icon PNGs, and theme-color metadata

**Files:**
- Modify: `public/favicon.svg`
- Modify: `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png` (regenerated, not hand-edited)
- Modify: `index.html:8` (theme-color meta tag)
- Modify: `public/manifest.json:8` (theme_color field)

**Interfaces:**
- None (static asset regeneration).

- [ ] **Step 1: Overwrite favicon.svg with the "C" mark**

`public/favicon.svg` is a static file consumed directly by the browser (not JSX), so it uses SVG attribute syntax (`stroke-width`, not `strokeWidth`). Write:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="20" fill="#2453C4" />
  <path
    d="M 27.37 25.16 A 9 9 0 1 1 27.37 14.84"
    fill="none"
    stroke="white"
    stroke-width="6"
    stroke-linecap="round"
  />
</svg>
```

This must stay pixel-for-pixel consistent with `Logo.tsx`'s path data — if Task 2/3's visual check required flipping the sweep-flag, apply the same flip here.

- [ ] **Step 2: Generate the PNG icon sizes with Pillow**

Run this from the repo root (adjust the sweep direction to match whatever Task 2/3 settled on if it needed flipping — this script draws the equivalent shape as a ring-with-a-wedge-cut-out, which is the raster equivalent of the SVG stroked arc):

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo && python3 -c "
from PIL import Image, ImageDraw

def draw_c_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([0, 0, size - 1, size - 1], fill=(36, 83, 196, 255))

    cx = cy = size / 2
    outer_r = size * 0.325
    inner_r = size * 0.175
    draw.ellipse([cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r], fill=(255, 255, 255, 255))
    draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], fill=(36, 83, 196, 255))

    wedge_r = outer_r + 2
    draw.pieslice([cx - wedge_r, cy - wedge_r, cx + wedge_r, cy + wedge_r], -35, 35, fill=(36, 83, 196, 255))
    return img

for name, size in [('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)]:
    draw_c_icon(size).save(f'public/{name}')
    print('wrote', name, size)
"
```

Expected output: three `wrote <name> <size>` lines, no errors. This overwrites the three existing PNG files in place.

- [ ] **Step 3: Update the theme-color meta tag**

Current (`index.html` line 8):

```html
    <meta name="theme-color" content="#f59e0b" />
```

Replace with:

```html
    <meta name="theme-color" content="#0E1023" />
```

- [ ] **Step 4: Update manifest.json's theme_color**

Current (`public/manifest.json` line 8):

```json
  "theme_color": "#f59e0b",
```

Replace with:

```json
  "theme_color": "#0E1023",
```

Leave `background_color` (`#ffffff`) untouched — that's the splash-screen background while the app loads, not a brand surface, and changing it isn't part of this spec's scope.

- [ ] **Step 5: Visual verification**

1. `preview_eval`: `document.querySelector('link[rel="icon"]').href` — confirm it resolves to `/favicon.svg`.
2. Open the favicon file directly: use the `Read` tool on `public/favicon.svg` to eyeball the markup one more time, and use `Read` on `public/icon-512.png` to visually confirm the PNG rendered a recognizable "C" (ring with a gap, not a solid disc or a solid ring with no gap).
3. `preview_screenshot` of the full page — confirm nothing else regressed (favicon changes aren't visible in a page screenshot, so this is mainly a sanity check that the dev server still runs cleanly after touching `index.html`).

- [ ] **Step 6: Commit**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo
git add public/favicon.svg public/apple-touch-icon.png public/icon-192.png public/icon-512.png index.html public/manifest.json
git commit -m "Regenerate favicon/PWA icons as C mark, update theme-color to brand-navy"
```

---

### Task 7: Generate the new Facebook avatar PNG

**Files:**
- Create: `~/Downloads/cesly_avatar_c.png` (not part of the git repo — a deliverable file for the user to manually upload to Facebook, same pattern as the two-arrows avatar generated earlier this session)

**Interfaces:**
- None (standalone script, no code dependencies).

- [ ] **Step 1: Generate the avatar**

```bash
mkdir -p /private/tmp/claude-502/-Users-eugeniusz-keptia-Documents-Developer-iOS/e2678768-eafe-4182-9cff-47be24dd3abd/scratchpad/avatar-c
python3 -c "
from PIL import Image, ImageDraw

canvas_size = 900
bg_color = (14, 16, 35)
circle_color = (36, 83, 196)

img = Image.new('RGB', (canvas_size, canvas_size), bg_color)
draw = ImageDraw.Draw(img)

circle_r = canvas_size * 0.35
cx = cy = canvas_size / 2
draw.ellipse([cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r], fill=circle_color)

outer_r = circle_r * 0.62
inner_r = circle_r * 0.34
draw.ellipse([cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r], fill=(255, 255, 255))
draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], fill=circle_color)

wedge_r = outer_r + 2
draw.pieslice([cx - wedge_r, cy - wedge_r, cx + wedge_r, cy + wedge_r], -35, 35, fill=circle_color)

out_path = '/private/tmp/claude-502/-Users-eugeniusz-keptia-Documents-Developer-iOS/e2678768-eafe-4182-9cff-47be24dd3abd/scratchpad/avatar-c/cesly_avatar_c.png'
img.save(out_path)
print('saved', out_path, img.size)
"
```

Expected: `saved <path> (900, 900)` printed, no errors.

- [ ] **Step 2: Visually confirm and copy to Downloads**

Use the `Read` tool on the generated PNG to confirm it visually matches the Logo.tsx/favicon.svg "C" mark (same gap direction, same proportions) before handing it to the user. Then:

```bash
cp /private/tmp/claude-502/-Users-eugeniusz-keptia-Documents-Developer-iOS/e2678768-eafe-4182-9cff-47be24dd3abd/scratchpad/avatar-c/cesly_avatar_c.png ~/Downloads/cesly_avatar_c.png
```

No commit needed for this task — the output lives in the user's Downloads folder, not the git repo.

---

### Task 8: Full-branch visual regression pass

**Files:** none (verification-only task)

**Interfaces:** none

- [ ] **Step 1: Start fresh and reload**

`preview_start` (or reuse the running `cesly-dev` server), `preview_eval`: `window.location.reload()`.

- [ ] **Step 2: Desktop homepage — top to bottom**

`preview_screenshot`, then scroll in increments (`preview_eval` with `window.scrollBy(0, 800)`) and screenshot again until the bottom of the page. Confirm:
- Navy nav bar, navy hero band with visible "C" logo and skyline silhouette, clean transition back to light background.
- Featured carousel, listing grid, cards, hover states, star ratings, "SUPER OKAZJA" badges — all still amber, unchanged from before this plan.
- FAQ section, "Popularne wyszukiwania" chips — unchanged, still light/amber.
- Footer — navy, matching the nav bar and hero exactly.

- [ ] **Step 3: Mobile viewport**

`preview_resize` to `mobile` preset. Screenshot the nav bar (collapsed + expanded via hamburger), the hero band, and the footer. Confirm text stays legible (sufficient contrast) at narrow width and nothing overflows horizontally.

- [ ] **Step 4: Listing detail page**

Click into any listing card (`preview_click`), screenshot. This page wasn't touched by this plan — confirm it still renders correctly and that navigating back to the homepage doesn't leave any stale styling.

- [ ] **Step 5: Console and typecheck sweep**

`preview_console_logs` with `level: "error"` — expect none.
Run: `cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo && npm run typecheck 2>&1 | grep -v -E "App\.tsx\(53|App\.tsx\(170|App\.tsx\(211|AddListingPage\.tsx\(40|AdminScrapingPage|AnalyticsPage|HomePage\.tsx\(1,8\)|HomePage\.tsx\(2,10\)|HomePage\.tsx\(2,18\)|ListingCard\.tsx\(2,26\)|ListingDetailPage|Logo\.tsx|Navigation\.tsx|Footer\.tsx|Notebook|ProfilePage"`
Expected: empty output, or only the known pre-existing baseline lines (adjust the grep exclusion list if the baseline has shifted since this plan was written — the point is confirming zero *new* errors from this plan's own changed files).

- [ ] **Step 6: Report to user**

Summarize what changed (nav/hero/footer navy, new "C" logo, new favicon/avatar) and remind the user that `~/Downloads/cesly_avatar_c.png` is ready for them to manually upload as the new Facebook profile picture (uploading it is the user's action, not something to automate).

No commit for this task — it's a verification pass over commits already made in Tasks 1-7.

