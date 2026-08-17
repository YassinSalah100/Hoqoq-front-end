/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0B192F',
          800: '#10233F',
          600: '#233A5C',
          500: '#374F73',
          400: '#5A7093',
          300: '#8B9EB7',
          200: '#C4CDDB',
          100: '#E4E8EF',
          50: '#F2F4F8',
        },
        emerald: {
          700: '#08543C',
          600: '#0A6046',
          500: '#0B6E4F',
          100: '#CDE9DC',
        },
        brass: {
          900: '#3D2F0F',
          800: '#5C4419',
          700: '#7A5F23',
          600: '#9A7629',
          500: '#B98B34',
          400: '#CBA35C',
          300: '#DCBE8A',
          200: '#EAD5AC',
          100: '#F3E4C2',
          50: '#FAF3E3',
        },
        rust: {
          600: '#7A2831',
          500: '#8C2F39',
          100: '#EFCFCD',
        },
        paper: {
          DEFAULT: '#FAFAF8',
          soft: '#F3F2ED',
          line: '#E5E2D9',
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
        card: '0 1px 2px rgba(16,35,63,0.06)',
        pop: '0 8px 24px rgba(16,35,63,0.12)',
      },
    },
  },
  plugins: [],
}
