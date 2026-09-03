/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---------------------------------------------------------------
        // Redesign 2026 tokens. The legacy amber/blue/orange overrides
        // further down stay untouched so pages that haven't been
        // reworked yet keep their current look; new surfaces use these.
        // ---------------------------------------------------------------
        ink: {
          50: '#f4f6fb',
          100: '#e6eaf4',
          200: '#c7d0e5',
          300: '#9aa8cb',
          400: '#6577a5',
          500: '#42527d',
          600: '#2c3a60',
          700: '#1d2a4c',
          800: '#131d38',
          900: '#0b1226',
          950: '#050817',
        },
        accent: {
          50: '#fff4ed',
          100: '#ffe4d3',
          200: '#ffc4a5',
          300: '#ff9c6d',
          400: '#ff7a45',
          500: '#f2601f',
          600: '#d94b13',
          700: '#b43a12',
          800: '#8f3016',
          900: '#742a15',
          950: '#3f1207',
        },
        canvas: {
          DEFAULT: '#ffffff',
          muted: '#f7f8fc',
          sunken: '#eef1f8',
        },
        'brand-navy': '#020636',
        'brand-navy-light': '#404367',
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
        // Replaced with the orange from the new car logo - amber-500
        // (the shade used for solid CTA buttons/badges throughout the
        // app) lands on that exact orange.
        amber: {
          50: '#fdf1ea',
          100: '#fbe1d2',
          200: '#f6c3a5',
          300: '#f0a374',
          400: '#e68249',
          500: '#d55d3f',
          600: '#b94e23',
          700: '#953d1b',
          800: '#742f15',
          900: '#56220f',
          950: '#38160a',
        },
        // One step darker than amber, same orange family, so gradients
        // like "from-amber-500 to-orange-500" stay within the new
        // brand hue instead of jumping to gold/yellow.
        orange: {
          50: '#fbe1d2',
          100: '#f6c3a5',
          200: '#f0a374',
          300: '#e68249',
          400: '#d55d3f',
          500: '#b94e23',
          600: '#953d1b',
          700: '#742f15',
          800: '#56220f',
          900: '#38160a',
          950: '#240e06',
        },
        // Secondary pages (auth modal, listing detail, messages, admin,
        // etc.) still used the pre-rebrand blue-* classes for buttons,
        // links and emphasized values. Redefined to the same brand
        // orange as `amber` so every blue-* usage site-wide matches the
        // new accent instead of clashing with it.
        blue: {
          50: '#fdf1ea',
          100: '#fbe1d2',
          200: '#f6c3a5',
          300: '#f0a374',
          400: '#e68249',
          500: '#d55d3f',
          600: '#b94e23',
          700: '#953d1b',
          800: '#742f15',
          900: '#56220f',
          950: '#38160a',
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
        display: [
          '"Plus Jakarta Sans"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        sans: [
          'Inter',
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
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(11, 18, 38, 0.04), 0 8px 24px -12px rgba(11, 18, 38, 0.12)',
        card: '0 1px 2px rgba(11, 18, 38, 0.05), 0 12px 32px -16px rgba(11, 18, 38, 0.22)',
        lift: '0 18px 48px -20px rgba(11, 18, 38, 0.40)',
        glow: '0 12px 40px -12px rgba(242, 96, 31, 0.55)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '56px 56px',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'translateY(-6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out both',
        'scale-in': 'scaleIn 0.14s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        'float-slow': 'floatSlow 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
