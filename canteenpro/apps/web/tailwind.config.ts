import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#13203F', 50: '#F1F4FA', 100: '#DCE3F1', 200: '#B7C4DF', 400: '#5B6F99', 600: '#2A3D6B', 700: '#1D2D55', 800: '#13203F', 900: '#0C1630' },
        turmeric: { DEFAULT: '#F2B200', 50: '#FFF8E1', 100: '#FFEDB3', 600: '#D99A00', 700: '#A87700' },
        leaf: { DEFAULT: '#1E8A4C', 50: '#E8F5EE' },
        steel: { DEFAULT: '#E8ECF2', 50: '#F5F7FA', 300: '#C9D1DE' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', '"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Figtree Variable"', 'Figtree', 'system-ui', 'sans-serif'],
      },
      maxWidth: { prose: '68ch' },
    },
  },
  plugins: [],
} satisfies Config;
