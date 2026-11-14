/** @type {import('tailwindcss').Config} */

// Colours, fonts, corner radius and shadows read CSS variables set by the active design
// (src/theme/ThemeProvider.tsx → applyDesign). Edit themes in src/theme/themes.ts, not here.
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const varScale = (family) =>
  Object.fromEntries(SHADES.map((s) => [s, `rgb(var(--c-${family}-${s}) / <alpha-value>)`]));
const r = (rem) => `calc(${rem}rem * var(--radius-scale, 1))`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--c-white) / <alpha-value>)',
        stone: varScale('stone'),
        brand: varScale('brand'),
        soil: varScale('soil'),
        amber: varScale('amber'),
        red: varScale('red'),
        blue: varScale('blue'),
        nasa: {
          ...varScale('nasa'),
          blue: 'rgb(var(--c-nasa-main) / <alpha-value>)',
          light: 'rgb(var(--c-nasa-light) / <alpha-value>)',
          red: '#FC3D21',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        display: ['var(--font-display)'],
      },
      borderRadius: {
        sm: r(0.125),
        DEFAULT: r(0.25),
        md: r(0.375),
        lg: r(0.5),
        xl: r(0.75),
        '2xl': r(1),
        '3xl': r(1.5),
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        md: 'var(--shadow-md)',
      },
    },
  },
  plugins: [],
};
