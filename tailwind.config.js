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
