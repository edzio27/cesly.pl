/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
