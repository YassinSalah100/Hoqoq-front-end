/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Warm brown scale anchored on the brand brown (#2B2010 = 800), so
        // every existing ink-* usage (text, sidebar, headers) follows the
        // logo palette instead of the old navy blue.
        ink: {
          900: '#1E160A',
          800: '#2B2010',
          600: '#4A3A22',
          500: '#5E4D34',
          400: '#7A6A52',
          300: '#A3947C',
          200: '#CFC5B3',
          100: '#EAE4D8',
          50: '#F5F1E9',
        },
        // Success states (active / paid / completed). A warm olive rather
        // than a cool emerald so it sits inside the gold-brown palette while
        // still reading clearly as "done" next to gold "pending" badges.
        emerald: {
          700: '#4E5A1C',
          600: '#5F6C25',
          500: '#727F30',
          100: '#EAECD2',
        },
        // Gold scale anchored on the brand gold (#B98B33 = 500), light gold
        // (#D9B45E = 400) and tagline gold (#8F6618 = 700).
        brass: {
          900: '#3D2E10',
          800: '#5C4418',
          700: '#8F6618',
          600: '#A47A26',
          500: '#B98B33',
          400: '#D9B45E',
          300: '#E5CB8E',
          200: '#EFDDB5',
          100: '#F6ECD4',
          50: '#FBF6EA',
        },
        rust: {
          600: '#7A2831',
          500: '#8C2F39',
          100: '#EFCFCD',
        },
        paper: {
          DEFAULT: '#FBFAF6',
          soft: '#F6F0E2',
          line: '#E3DDCC',
        },
        // Exact brand palette (logo-derived) — kept separate from the
        // pre-existing ink/brass/paper tokens above rather than merged into
        // them, since those are close-but-not-identical hexes used across
        // the rest of the app; `brand-*` is for places that must match the
        // logo exactly (currently: the login page).
        brand: {
          gold: '#B98B33',
          'gold-light': '#D9B45E',
          brown: '#2B2010',
          cream: '#F6F0E2',
          'cream-light': '#FBFAF6',
          tagline: '#8F6618',
          border: '#E3DDCC',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'sans-serif'],
        display: ['Amiri', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        xs: '10px',
        sm: '11.5px',
        base: '13px',
        lg: '15px',
        xl: '17px',
        '2xl': '20px',
        '3xl': '26px',
        '4xl': '30px',
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(43,32,16,0.08)',
        pop: '0 8px 24px rgba(43,32,16,0.12)',
      },
    },
  },
  plugins: [],
}
