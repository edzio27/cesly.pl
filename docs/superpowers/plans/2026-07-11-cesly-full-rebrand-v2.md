# Cesly.pl Full Rebrand v2 (Looka Brand Kit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the site's current navy/"C"-mark branding with the user's Looka brand kit — a gradient arrow logo, a full blue/navy/cyan/gold/green color system, and Urbanist typography — using Tailwind color-scale redefinition so the ~550 existing `gray-*`/`amber-*`/`orange-*`/`emerald-*` class usages across ~20 files pick up the new brand colors automatically, with no per-component edits.

**Architecture:** `tailwind.config.js` becomes the single source of truth for the new palette — `gray` is redefined to Tailwind's `slate` scale, `amber` to a shifted `yellow` scale (landing exactly on the brand's gold), `orange` to a shifted version of the *old* amber scale (kept as a deeper accent for gradients), and `emerald` to Tailwind's `green` scale. Two files with hardcoded (non-token) hex values — `Logo.tsx` and `favicon.svg` — get a new gradient arrow icon. Six binary assets (3 favicon PNGs, OG image, Facebook avatar, Facebook cover) get regenerated with Python/Pillow, reusing the supersample-then-`LANCZOS`-downscale technique already proven earlier this session for anti-aliased edges.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, Vite, Python 3 + Pillow for PNG generation, Google Fonts (Urbanist) via `<link>`.

## Global Constraints

- Color hex values (from the spec, copied verbatim): Primary Blue `#2563EB`, Navy Dark `#0F172A`, Accent Cyan `#22D3EE`, Background `#F8FAFC`, Success `#16A34A`, Warning `#FACC15`.
- `amber-500` (the shade most used for solid CTA buttons/badges throughout the codebase) must resolve to exactly `#FACC15` — this is the brand's called-out Warning/gold color and the primary visual accent.
- `gray-900` must resolve to exactly `#0F172A` (Navy Dark) and `gray-50` to exactly `#F8FAFC` (Background).
- `emerald-600` must resolve to exactly `#16A34A` (Success) — this is the deal-score "positive" color.
- Do not edit any of the ~20 component files that only use Tailwind color classes (`ListingCard.tsx`, `HomePage.tsx`, `AddListingPage.tsx`, `AnalyticsPage.tsx`, `Navigation.tsx`, `Footer.tsx`, `ListingDetailPage.tsx`, `dealScore.ts`, etc.) — the whole point of this plan is that they need zero direct changes and pick up new colors through the redefined Tailwind scales. If a task in this plan asks you to edit one of those files for a reason *other than* the two confirmed hardcoded-hex exceptions (`Logo.tsx`, `favicon.svg`), stop and treat it as a plan error.
- Every regenerated PNG must use the supersample (3-4x) + `Image.resize(..., Image.LANCZOS)` technique — never draw shapes directly at target resolution with plain `ImageDraw` (this produces visibly jagged/aliased edges, a defect found and fixed earlier this session).
- This repo has no automated test runner (no jest/vitest, no `*.test.tsx` files anywhere). Verification throughout this plan is `npm run typecheck`, `npm run build`, and manual browser verification via the `Claude_Browser`/`Claude_Preview` MCP tools — whichever is available in your session (tool names have changed once already this session; check what's available and use it, the underlying workflow — `preview_start` with name `cesly-rebrand-dev`, screenshot, console-log check — is the same either way).
- The dev server config `cesly-rebrand-dev` (port 5174) lives in `/Users/eugeniusz.keptia/Documents/Developer/iOS/.claude/launch.json` — **not** in this worktree's own `.claude/launch.json` (a fixed-location quirk discovered earlier this session). Use `preview_start` with `name: "cesly-rebrand-dev"` directly; it already works.
- Work in the git worktree at `/Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo/.claude/worktrees/cesly-rebrand`, branch `worktree-cesly-rebrand` — not the main repo checkout. This worktree already has `node_modules` (symlinked) and `.env` (copied, gitignored) so the dev server boots cleanly.

---

### Task 1: Redefine Tailwind color/font/radius tokens and load Urbanist

**Files:**
- Modify: `tailwind.config.js` (full rewrite of the `theme.extend` block)
- Modify: `index.html:8` (theme-color meta) and the `<head>` (add Google Fonts link)

**Interfaces:**
- Produces: Tailwind utility classes `gray-*`, `amber-*`, `orange-*`, `emerald-*` now resolve to brand colors; `brand-navy` = `#0F172A`, `brand-blue` = `#2563EB`, `brand-cyan` = `#22D3EE` (new); `font-sans` (Tailwind's default body font) resolves to Urbanist; `rounded-lg`/`rounded-md`/`rounded-xl`/`rounded-2xl` resolve to the new radius scale. Consumed implicitly by every existing component (no code changes needed in them) and directly by Task 2 (`brand-blue`/`brand-cyan` in the new logo gradient).

- [ ] **Step 1: Rewrite tailwind.config.js**

Current file:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
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
  },
  plugins: [],
};
```

Replace with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-navy': '#0F172A',
        'brand-blue': '#2563EB',
        'brand-cyan': '#22D3EE',
        // Redefined to Tailwind's own `slate` scale so gray-900 lands
        // exactly on the brand's Navy Dark (#0F172A) and gray-50 on
        // Background (#F8FAFC). Every existing gray-* class site-wide
        // picks this up automatically.
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Shifted one step from Tailwind's `yellow` scale so amber-500
        // (the shade used for solid CTA buttons/badges throughout the
        // app) lands exactly on the brand's Warning gold (#FACC15).
        amber: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#fde047',
          500: '#facc15',
          600: '#eab308',
          700: '#ca8a04',
          800: '#a16207',
          900: '#854d0e',
          950: '#713f12',
        },
        // Shifted from the *old* pre-rebrand amber scale so gradients
        // like "from-amber-500 to-orange-500" read as bright gold ->
        // deep gold, not a jump to a clashing true orange hue (the
        // brand guide doesn't define an orange; this keeps the
        // existing gradient direction coherent with the new palette).
        orange: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
          950: '#451a03',
        },
        // Redefined to Tailwind's `green` scale so emerald-600 (used
        // for the deal-score "positive" badge) lands exactly on the
        // brand's Success color (#16A34A). Plain green-* classes
        // elsewhere already match this value under default Tailwind
        // and are untouched.
        emerald: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
      fontFamily: {
        sans: [
          'Urbanist',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        md: '8px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
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
  },
  plugins: [],
};
```

- [ ] **Step 2: Load Urbanist and update theme-color in index.html**

Current (`index.html` lines 5-9):

```html
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#0E1023" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

Replace with:

```html
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#0F172A" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 3: Verify the build picks up the new config**

Run: `cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo/.claude/worktrees/cesly-rebrand && npm run build 2>&1 | tail -15`
Expected: build succeeds, no Tailwind config errors.

- [ ] **Step 4: Visual spot-check**

`preview_start` with `name: "cesly-rebrand-dev"`, reload, screenshot the homepage. Confirm: body text now renders in Urbanist (rounder, more geometric letterforms than the previous default sans-serif — compare the "Największa baza..." heading), CTA buttons and price text are now gold/yellow instead of amber-orange, and nothing looks structurally broken (this is a large color swap — expect the whole page to look different, that's correct; just confirm nothing is unreadable or missing).

- [ ] **Step 5: Commit**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo/.claude/worktrees/cesly-rebrand
git add tailwind.config.js index.html
git commit -m "Redefine gray/amber/orange/emerald to the Looka brand palette, add Urbanist font and radius tokens"
```

---

### Task 2: Recreate Logo.tsx as a gradient arrow icon

**Files:**
- Modify: `src/components/Logo.tsx` (full rewrite, currently 26 lines)

**Interfaces:**
- Consumes: `brand-blue` (`#2563EB`) and `brand-cyan` (`#22D3EE`) hex values from Task 1 (used as literal gradient stop colors in the SVG — Tailwind classes can't reach into an SVG `<stop>` element, so these are hardcoded here exactly like the old `#2453C4` was, but now matching the new token values).
- Produces: same `Logo({ size?: number; className?: string })` signature as before (unchanged) — existing call sites in `Navigation.tsx` and `HomePage.tsx` keep working with zero changes.

- [ ] **Step 1: Replace the component body**

Current file:

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
      <defs>
        <linearGradient id="cesly-arrow-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <path
        d="M 7 31 C 9 18, 15 11, 24 9"
        fill="none"
        stroke="url(#cesly-arrow-gradient)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <polygon points="33,6 22,7.5 28,18" fill="url(#cesly-arrow-gradient)" />
    </svg>
  );
}
```

This draws an upward-curving swoosh (a quadratic-style bezier from bottom-left to upper-right) with a triangular arrowhead at the end, both filled with a blue-to-cyan gradient — the same "road/growth arrow" concept as the user's reference logo, simplified to read clearly at small sizes.

- [ ] **Step 2: Typecheck**

Run: `cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo/.claude/worktrees/cesly-rebrand && npx tsc --noEmit 2>&1 | grep -i "Logo.tsx"`
Expected: no output.

- [ ] **Step 3: Visual verification — confirm it reads as an upward arrow, iterate if not**

`preview_start` with `name: "cesly-rebrand-dev"` (reuse if already running from Task 1), reload, screenshot the nav bar (top-left) and the homepage hero (both already render `<Logo>` from the previous rebrand — no wiring changes needed). Zoom into the icon.

Check: does it clearly read as an upward-right-pointing arrow/swoosh with a visible gradient from blue to cyan? The arrowhead should look like a triangle pointing up-and-right, attached to the end of the curve, not floating disconnected or pointing the wrong way.

If it doesn't read clearly (e.g., arrowhead misaligned, curve too subtle, gradient direction looks wrong), adjust the `path d` control points and/or `polygon points` coordinates directly in `Logo.tsx` and re-screenshot. This is a decorative vector shape — iterate on the coordinates until it looks right; there's no single correct numeric answer, only "does it read as an arrow at a glance."

- [ ] **Step 4: Commit**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo/.claude/worktrees/cesly-rebrand
git add src/components/Logo.tsx
git commit -m "Recreate Logo as a gradient arrow icon matching the Looka brand kit"
```

---

### Task 3: Regenerate favicon.svg and PWA icon PNGs

**Files:**
- Modify: `public/favicon.svg`
- Modify: `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png` (regenerated, not hand-edited)

**Interfaces:**
- Consumes: the final arrow path/polygon coordinates settled on in Task 2 (read the committed `src/components/Logo.tsx` to get them — they must match exactly, this file is the second of the two confirmed hardcoded-hex locations from the spec).

- [ ] **Step 1: Overwrite favicon.svg with the same arrow icon**

Read `src/components/Logo.tsx` first to get the exact current `path d` and `polygon points` values (Task 2 may have adjusted them from the plan's starting coordinates during visual verification). Write `public/favicon.svg` as a static SVG file (note: kebab-case attributes, no `role`/`aria-label` needed on a favicon):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <defs>
    <linearGradient id="cesly-arrow-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#22D3EE" />
    </linearGradient>
  </defs>
  <path
    d="M 7 31 C 9 18, 15 11, 24 9"
    fill="none"
    stroke="url(#cesly-arrow-gradient)"
    stroke-width="5"
    stroke-linecap="round"
  />
  <polygon points="33,6 22,7.5 28,18" fill="url(#cesly-arrow-gradient)" />
</svg>
```

(Replace the `path d` and `polygon points` values with whatever Task 2 actually committed, if different from these starting coordinates.)

- [ ] **Step 2: Generate the PNG icon sizes with Pillow**

The icon is a stroked curve + filled triangle, not a simple ellipse, so building it in Pillow needs a bezier-sampled mask rather than the ring-and-wedge technique used for the old "C" mark. Run from the repo root:

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo/.claude/worktrees/cesly-rebrand && python3 -c "
from PIL import Image, ImageDraw

def bezier_point(t, p0, p1, p2):
    x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
    y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
    return (x, y)

def make_gradient(size, c1, c2):
    row = Image.new('RGB', (size, 1))
    px = row.load()
    for x in range(size):
        t = x / (size - 1)
        px[x, 0] = (
            int(c1[0] + (c2[0] - c1[0]) * t),
            int(c1[1] + (c2[1] - c1[1]) * t),
            int(c1[2] + (c2[2] - c1[2]) * t),
        )
    return row.resize((size, size))

def draw_arrow_icon(size, scale=4):
    S = size * scale
    def pt(x, y):
        return (x / 40 * S, y / 40 * S)

    mask = Image.new('L', (S, S), 0)
    mdraw = ImageDraw.Draw(mask)

    p0, p1, p2 = pt(7, 31), pt(15, 11), pt(24, 9)
    points = [bezier_point(i / 120, p0, p1, p2) for i in range(121)]
    stroke_w = int(5 / 40 * S)
    mdraw.line(points, fill=255, width=stroke_w, joint='curve')
    r = stroke_w / 2
    for px, py in points:
        mdraw.ellipse([px - r, py - r, px + r, py + r], fill=255)

    tip, base1, base2 = pt(33, 6), pt(22, 7.5), pt(28, 18)
    mdraw.polygon([tip, base1, base2], fill=255)

    gradient = make_gradient(S, (37, 99, 235), (34, 211, 238))
    icon = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    icon.paste(gradient, (0, 0), mask)
    return icon.resize((size, size), Image.LANCZOS)

for name, size in [('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)]:
    draw_arrow_icon(size).save(f'public/{name}')
    print('wrote', name, size)
"
```

Expected output: three `wrote <name> <size>` lines, no errors.

**Why a circle at every sampled point, not just the two endpoints:** an earlier version of this script (drawn only with `line(..., joint='curve')` plus end-cap circles) produced small jagged notches along both edges of the curve at supersampled resolution — the joints between straight polyline segments don't fully round out at 61 samples. Sampling more densely (121 points) and stamping a filled circle at every single point closes those notches completely (verified visually before this plan was finalized). Do not simplify this back to endpoint-only circles.

**Important:** if Task 2's final committed coordinates differ from `(7,31)`/`(15,11)`/`(24,9)` for the curve or `(33,6)`/`(22,7.5)`/`(28,18)` for the arrowhead, use those actual values in the `pt(...)` calls above instead, so the PNG icons match the SVG exactly.

- [ ] **Step 3: Visual inspection**

Use the `Read` tool on `public/icon-512.png` to confirm: a smooth (not jagged/pixelated) blue-to-cyan gradient arrow on a transparent background, matching the on-site nav bar icon from Task 2's verification.

- [ ] **Step 4: Commit**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo/.claude/worktrees/cesly-rebrand
git add public/favicon.svg public/apple-touch-icon.png public/icon-192.png public/icon-512.png
git commit -m "Regenerate favicon and PWA icons with the new gradient arrow mark"
```

---

### Task 4: Regenerate the OG/social share image and update its references

**Files:**
- Modify: `public/og-image.png` (regenerated, not hand-edited)
- Modify: `public/manifest.json:8` (theme_color)
- Modify: `supabase/functions/sitemap/index.ts` (image sitemap URL — already points at `/og-image.png` from the earlier rebrand today, but the file content is being replaced)

**Interfaces:**
- Consumes: the same `draw_arrow_icon`/`make_gradient`/`bezier_point` approach from Task 3, plus a skyline silhouette and text rendering (same techniques used earlier today for the previous og-image.png).

- [ ] **Step 1: Generate the new OG image**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo/.claude/worktrees/cesly-rebrand && python3 -c "
from PIL import Image, ImageDraw, ImageFont
import random

def bezier_point(t, p0, p1, p2):
    x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
    y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
    return (x, y)

def make_gradient(w, h, c1, c2):
    row = Image.new('RGB', (w, 1))
    px = row.load()
    for x in range(w):
        t = x / (w - 1)
        px[x, 0] = (
            int(c1[0] + (c2[0] - c1[0]) * t),
            int(c1[1] + (c2[1] - c1[1]) * t),
            int(c1[2] + (c2[2] - c1[2]) * t),
        )
    return row.resize((w, h))

NAVY = (15, 23, 42)
NAVY_DARK = (7, 12, 24)
BLUE = (37, 99, 235)
CYAN = (34, 211, 238)
GOLD = (250, 204, 21)

W, H, S = 1200, 630, 3
SW, SH = W * S, H * S

img = Image.new('RGB', (SW, SH), NAVY)
draw = ImageDraw.Draw(img)
for y in range(SH):
    t = y / SH
    r = int(NAVY[0] + (NAVY_DARK[0] - NAVY[0]) * t)
    g = int(NAVY[1] + (NAVY_DARK[1] - NAVY[1]) * t)
    b = int(NAVY[2] + (NAVY_DARK[2] - NAVY[2]) * t)
    draw.line([(0, y), (SW, y)], fill=(r, g, b))

random.seed(7)
base_y = SH - 40 * S
x = 0
while x < SW:
    bw = random.randint(40, 90) * S
    bh = random.randint(60, 160) * S
    overlay = Image.new('RGBA', (bw, bh), (255, 255, 255, 14))
    region = img.crop((x, base_y - bh, x + bw, base_y)).convert('RGBA')
    img.paste(Image.alpha_composite(region, overlay).convert('RGB'), (x, base_y - bh))
    x += bw
draw = ImageDraw.Draw(img)

# arrow icon, centered above the wordmark
icon_size = 140 * S
def pt(px, py):
    return (px / 40 * icon_size, py / 40 * icon_size)

mask = Image.new('L', (icon_size, icon_size), 0)
mdraw = ImageDraw.Draw(mask)
p0, p1, p2 = pt(7, 31), pt(15, 11), pt(24, 9)
points = [bezier_point(i / 120, p0, p1, p2) for i in range(121)]
stroke_w = int(5 / 40 * icon_size)
mdraw.line(points, fill=255, width=stroke_w, joint='curve')
r = stroke_w / 2
for px, py in points:
    mdraw.ellipse([px - r, py - r, px + r, py + r], fill=255)
tip, base1, base2 = pt(33, 6), pt(22, 7.5), pt(28, 18)
mdraw.polygon([tip, base1, base2], fill=255)
icon_gradient = make_gradient(icon_size, icon_size, BLUE, CYAN)
icon = Image.new('RGBA', (icon_size, icon_size), (0, 0, 0, 0))
icon.paste(icon_gradient, (0, 0), mask)
icon_x = SW // 2 - icon_size // 2
icon_y = 90 * S
img.paste(icon, (icon_x, icon_y), icon)
draw = ImageDraw.Draw(img)

font_path = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
font_big = ImageFont.truetype(font_path, 72 * S)
font_small = ImageFont.truetype(font_path, 30 * S)

text = 'Cesly.pl'
bbox = draw.textbbox((0, 0), text, font=font_big)
tw = bbox[2] - bbox[0]
draw.text((SW / 2 - tw / 2, 300 * S), text, font=font_big, fill=(255, 255, 255))

tagline = 'Największa baza cesji leasingów w Polsce'
bbox2 = draw.textbbox((0, 0), tagline, font=font_small)
tw2 = bbox2[2] - bbox2[0]
draw.text((SW / 2 - tw2 / 2, 400 * S), tagline, font=font_small, fill=GOLD)

img = img.resize((W, H), Image.LANCZOS)
img.save('public/og-image.png')
print('saved', img.size)
"
```

This script (including the Polish-diacritics tagline string above) was test-run while writing this plan and visually confirmed correct — Arial Bold renders `ą`/`ę`/`ó`/`ł` etc. properly, matching the earlier same-day fix for the previous og-image.png.

- [ ] **Step 2: Update manifest.json's theme_color**

Current (`public/manifest.json` line 8):

```json
  "theme_color": "#f59e0b",
```

(Note: if a prior task already changed this to `#0E1023` from the earlier same-day rebrand, the "current" value you see may be `#0E1023` instead — either way, replace whatever is there with the new value below.)

Replace with:

```json
  "theme_color": "#0F172A",
```

- [ ] **Step 3: Confirm the sitemap function's image reference is still correct**

Read `supabase/functions/sitemap/index.ts` and confirm the `<image:loc>` line points at `https://cesly.pl/og-image.png` (it should already, from the earlier same-day fix — this task only regenerates the image file itself, the URL doesn't change). No edit needed if it already says `/og-image.png`; if it somehow still says `cesly_logo_final.png` or anything else, update it to `https://cesly.pl/og-image.png`.

- [ ] **Step 4: Visual inspection and build check**

Use `Read` on `public/og-image.png` to confirm it shows the new gradient arrow icon, "Cesly.pl" in white, and the tagline in gold, on the navy gradient background with the skyline silhouette — smooth edges, no jagged arrow.

Run: `cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo/.claude/worktrees/cesly-rebrand && npm run build 2>&1 | tail -5`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo/.claude/worktrees/cesly-rebrand
git add public/og-image.png public/manifest.json
git commit -m "Regenerate OG share image with the new arrow logo and palette"
```

(Include `supabase/functions/sitemap/index.ts` in this commit too if Step 3 required an edit.)

---

### Task 5: Generate the new Facebook avatar from the user's own logo file

**Files:**
- Create: a new avatar PNG in the user's Downloads folder (not part of the git repo)

**Interfaces:** none (standalone script).

- [ ] **Step 1: Resize the user's source file**

The user's own `Logo - Blue Gradient.png` (a clean, complete 500x500 lockup with no rendering glitches, confirmed during spec research) is used directly rather than hand-drawn, upscaled to the standard 900x900 Facebook avatar size:

```bash
python3 -c "
from PIL import Image

src = Image.open('/Users/eugeniusz.keptia/Downloads/Rebranding cesly.pl i logo/Logo - Blue Gradient.png').convert('RGB')
print('source size', src.size)
resized = src.resize((900, 900), Image.LANCZOS)
out_path = '/Users/eugeniusz.keptia/Downloads/cesly_avatar_v2.png'
resized.save(out_path)
print('saved', out_path, resized.size)
"
```

Expected: prints the source size (500, 500) and confirms the save at (900, 900).

- [ ] **Step 2: Visual inspection**

Use `Read` on `/Users/eugeniusz.keptia/Downloads/cesly_avatar_v2.png` to confirm the upscale didn't introduce visible blur or artifacts (500->900 is a ~1.8x upscale of a already-clean source image; `LANCZOS` should keep it sharp — if it looks soft, that's an inherent limit of upscaling a fixed-resolution source, not a bug, and is fine to leave as-is since 900x900 is what Facebook recommends but it will also happily accept the original 500x500 file directly with no upscale at all if sharpness matters more than hitting the exact recommended size — note this tradeoff when reporting to the user, don't silently pick one).

No commit needed — this file lives in the user's Downloads folder, not the git repo.

---

### Task 6: Design a new Facebook cover image

**Files:**
- Create: a new cover PNG in the user's Downloads folder (not part of the git repo)

**Interfaces:**
- Consumes: the same `bezier_point`/`make_gradient` arrow-icon technique from Task 4, at cover-image scale.

- [ ] **Step 1: Generate the cover image**

Facebook cover photos display at 820x312 (2x = 1640x624 recommended upload size, same convention used for the previous cover image earlier today). Content sits right-of-center; the left ~40% stays visually clear since the circular profile-picture avatar overlaps that corner on desktop.

```bash
python3 -c "
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random

def bezier_point(t, p0, p1, p2):
    x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
    y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
    return (x, y)

def make_gradient(w, h, c1, c2):
    row = Image.new('RGB', (w, 1))
    px = row.load()
    for x in range(w):
        t = x / (w - 1)
        px[x, 0] = (
            int(c1[0] + (c2[0] - c1[0]) * t),
            int(c1[1] + (c2[1] - c1[1]) * t),
            int(c1[2] + (c2[2] - c1[2]) * t),
        )
    return row.resize((w, h))

NAVY = (15, 23, 42)
NAVY_DARK = (7, 12, 24)
BLUE = (37, 99, 235)
CYAN = (34, 211, 238)
GOLD = (250, 204, 21)

W, H, S = 1640, 624, 3
SW, SH = W * S, H * S

img = Image.new('RGB', (SW, SH), NAVY)
draw = ImageDraw.Draw(img)
for y in range(SH):
    t = y / SH
    r = int(NAVY[0] + (NAVY_DARK[0] - NAVY[0]) * t)
    g = int(NAVY[1] + (NAVY_DARK[1] - NAVY[1]) * t)
    b = int(NAVY[2] + (NAVY_DARK[2] - NAVY[2]) * t)
    draw.line([(0, y), (SW, y)], fill=(r, g, b))

# soft glow wash, blue/cyan themed to match the new palette
glow = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(glow)
gdraw.ellipse([SW*0.55, -SH*0.4, SW*0.55+SW*0.6, SH*0.5], fill=(37,99,235,55))
gdraw.ellipse([SW*0.75, SH*0.1, SW*0.75+SW*0.45, SH*0.1+SH*0.55], fill=(34,211,238,45))
glow = glow.filter(ImageFilter.GaussianBlur(140*S))
img = Image.alpha_composite(img.convert('RGBA'), glow).convert('RGB')
draw = ImageDraw.Draw(img)

# skyline silhouette
random.seed(11)
base_y = SH - 40 * S
x = 0
while x < SW:
    bw = random.randint(50, 110) * S
    bh = random.randint(70, 190) * S
    overlay = Image.new('RGBA', (bw, bh), (255, 255, 255, 12))
    region = img.crop((x, base_y - bh, x + bw, base_y)).convert('RGBA')
    img.paste(Image.alpha_composite(region, overlay).convert('RGB'), (x, base_y - bh))
    x += bw
draw = ImageDraw.Draw(img)

# arrow icon + wordmark, right of the clear left zone
content_x = int(SW * 0.44)
icon_size = 130 * S
def pt(px, py):
    return (px / 40 * icon_size, py / 40 * icon_size)

mask = Image.new('L', (icon_size, icon_size), 0)
mdraw = ImageDraw.Draw(mask)
p0, p1, p2 = pt(7, 31), pt(15, 11), pt(24, 9)
points = [bezier_point(i / 120, p0, p1, p2) for i in range(121)]
stroke_w = int(5 / 40 * icon_size)
mdraw.line(points, fill=255, width=stroke_w, joint='curve')
r = stroke_w / 2
for px, py in points:
    mdraw.ellipse([px - r, py - r, px + r, py + r], fill=255)
tip, base1, base2 = pt(33, 6), pt(22, 7.5), pt(28, 18)
mdraw.polygon([tip, base1, base2], fill=255)
icon_gradient = make_gradient(icon_size, icon_size, BLUE, CYAN)
icon = Image.new('RGBA', (icon_size, icon_size), (0, 0, 0, 0))
icon.paste(icon_gradient, (0, 0), mask)
icon_x = content_x
icon_y = 130 * S
img.paste(icon, (icon_x, icon_y), icon)
draw = ImageDraw.Draw(img)

font_path = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
font_word = ImageFont.truetype(font_path, 54 * S)
font_tag = ImageFont.truetype(font_path, 30 * S)
font_cta = ImageFont.truetype(font_path, 26 * S)

draw.text((icon_x + icon_size + 15*S, icon_y + icon_size//2 - 34*S), 'Cesly.pl', font=font_word, fill=(255,255,255))
draw.text((content_x, 300*S), 'Oddaj lub przejmij leasing', font=font_tag, fill=(255,255,255))
draw.text((content_x, 342*S), 'bez zbędnych formalności', font=font_tag, fill=(255,255,255))

cta_text = 'Dodaj ogłoszenie:  cesly.pl'
bbox = draw.textbbox((0,0), cta_text, font=font_cta)
tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
pad_x, pad_y = 26*S, 16*S
pill_x0, pill_y0 = content_x, 420*S
pill_x1, pill_y1 = pill_x0 + tw + pad_x*2, pill_y0 + th + pad_y*2
draw.rounded_rectangle([pill_x0, pill_y0, pill_x1, pill_y1], radius=(pill_y1-pill_y0)//2, fill=GOLD)
draw.text((pill_x0 + pad_x, pill_y0 + pad_y - bbox[1]), cta_text, font=font_cta, fill=(15,23,42))

img = img.resize((W, H), Image.LANCZOS)
out_path = '/Users/eugeniusz.keptia/Downloads/cesly_fb_cover_v2.png'
img.save(out_path)
print('saved', out_path, img.size)
"
```

This script was test-run while writing this plan and visually confirmed correct — the Polish diacritics (`zbędnych formalności`, `ogłoszenie`) render properly, the arrow icon is smooth, and the layout reads well with the left ~40% clear for the profile-picture overlap.

- [ ] **Step 2: Visual inspection**

Use `Read` on `/Users/eugeniusz.keptia/Downloads/cesly_fb_cover_v2.png` to confirm: smooth gradient arrow icon (no jagged edges), "Cesly.pl" wordmark, tagline, gold CTA pill, skyline silhouette, and that the left ~40% is visually clear enough for a circular profile picture to overlap without covering any text.

No commit needed — this file lives in the user's Downloads folder, not the git repo.

---

### Task 7: Full-site visual regression sweep

**Files:** none (verification-only task)

**Interfaces:** none

- [ ] **Step 1: Typecheck and build**

Run: `cd /Users/eugeniusz.keptia/Documents/Developer/cesly.pl/repo/.claude/worktrees/cesly-rebrand && npm run typecheck 2>&1 | grep "error TS" | wc -l`
Expected: exactly matches the known pre-existing baseline count from before this plan started (confirm by checking `.superpowers/sdd/progress.md` in this worktree for the last recorded baseline count, or by comparing against `git stash` + re-running typecheck on the pre-change tree if the ledger doesn't have it — the key requirement is zero *new* errors, not zero errors).

Run: `npm run build 2>&1 | tail -5`
Expected: succeeds.

- [ ] **Step 2: Desktop homepage sweep**

`preview_start` with `name: "cesly-rebrand-dev"`, reload, screenshot top of homepage. Confirm: navy hero/nav with the new gradient arrow logo and "Cesly.pl" text, gold (not amber-orange) CTA buttons and price highlights, Urbanist font visibly applied to headings and body text.

Scroll down and screenshot the listing grid, featured carousel, and FAQ section. Confirm: "SUPER OKAZJA" badges and star ratings that were emerald/green now show the brand's green (should look the same or very close, since emerald was redefined to match the existing green almost exactly), price/CTA elements are gold, card corner radius looks slightly more rounded than before (10px vs. the old default).

Scroll to the footer. Confirm: navy background matches the nav bar exactly (same token, `brand-navy`), Facebook link icon still present and functional.

- [ ] **Step 3: Mobile viewport**

`preview_resize` to `mobile` preset (or the equivalent tool available in your session). Screenshot the nav bar (collapsed + hamburger menu open), hero, and footer. Confirm legibility and that the new font renders correctly at small sizes.

- [ ] **Step 4: Listing detail and add-listing pages**

Click into a listing card, screenshot the detail page — confirm the deal-score panel (which uses `emerald-*`/`amber-*`/`orange-*` for its score-tier colors) now shows the new palette and still reads clearly (green for good deals, gold for the price fields, no leftover old-amber-orange anywhere).

Navigate to the add-listing form (may require being logged in — if no test account is available in this environment, skip this specific page and note it in the report rather than blocking on it). If accessible, confirm form inputs, buttons, and the "Wyciągnij dane" AI button all render in the new palette.

- [ ] **Step 5: Console and zoomed-icon check**

Check console logs for errors (via whatever tool is available — `preview_console_logs` or equivalent) — expect none.

Zoom into the nav bar logo icon on a screenshot (or use `Read` on `public/icon-512.png` again) — confirm no jagged/aliased edges anywhere, consistent with the anti-aliasing fix established earlier this session.

- [ ] **Step 6: Report to user**

Summarize what changed (full color palette, Urbanist font, new gradient arrow logo, regenerated favicon/OG/avatar/cover) and remind the user that `~/Downloads/cesly_avatar_v2.png` and `~/Downloads/cesly_fb_cover_v2.png` are ready for them to manually upload to Facebook (uploading is the user's action, not automatable) — and flag the Task 5 tradeoff note (900x900 upscale vs. using the original 500x500 file as-is) so the user can decide which to actually upload.

No commit for this task — it's a verification pass over commits already made in Tasks 1-6.
