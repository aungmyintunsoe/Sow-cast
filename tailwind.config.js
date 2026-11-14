/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2fbf4',
          100: '#e1f6e6',
          200: '#c5eccf',
          300: '#97dca7',
          400: '#62c279',
          500: '#3ba755',
          600: '#2c8742',
          700: '#256b37',
          800: '#21552f',
          900: '#1d4628',
          950: '#0b2614',
        },
        nasa: {
          blue: '#0B3D91',
          red: '#FC3D21',
          light: '#E8F0FE',
        },
        soil: {
          50: '#fbf7f4',
          100: '#f6ede7',
          200: '#eed9ce',
          300: '#e1bead',
          400: '#d09c85',
          500: '#be7e62',
          600: '#a7654b',
          700: '#8b513c',
          800: '#724334',
          900: '#5e3a2f',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
