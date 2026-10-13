/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        earth: {
          50: '#f7f6f2',
          100: '#eeebe1',
          200: '#ded7c5',
          300: '#cabb9f',
          400: '#b49f78',
          500: '#9d8457',
          600: '#846d45',
          700: '#685438',
          800: '#4f3f2d',
          900: '#382c21',
        },
        agri: {
          50: '#f2f8f4',
          100: '#e1f0e6',
          200: '#c2e0cd',
          300: '#95cca8',
          400: '#5fae7c',
          500: '#389158',
          600: '#2b7847',
          700: '#235f39',
          800: '#1e4d2f',
          900: '#173f27',
          950: '#0c2315',
        },
        cream: {
          50: '#fdfbf7',
          100: '#f9f6ee',
          200: '#f2ebd9',
          300: '#e8dcbe',
          400: '#dcc99d',
        },
        amberAccent: {
          DEFAULT: '#b45309',
          light: '#d97706',
          dark: '#92400e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Telugu', 'system-ui', 'sans-serif'],
        telugu: ['Noto Sans Telugu', 'Inter', 'sans-serif'],
      },
      minHeight: {
        'touch': '48px',
      },
      minWidth: {
        'touch': '48px',
      }
    },
  },
  plugins: [],
}
