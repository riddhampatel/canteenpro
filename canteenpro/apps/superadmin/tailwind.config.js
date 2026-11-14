/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#eef3ff', 100: '#dce6ff', 200: '#b9cbff', 300: '#8aa6fb', 400: '#5a7cf2',
          500: '#3557e3', 600: '#2442c7', 700: '#1d35a1', 800: '#1b2f80', 900: '#1a2b66', 950: '#111a40',
        },
        ink: { DEFAULT: '#0f172a', soft: '#475569', mute: '#94a3b8' },
      },
      boxShadow: { card: '0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)' },
    },
  },
  plugins: [],
};
