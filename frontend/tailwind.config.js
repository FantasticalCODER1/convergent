import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Avenir Next"', ...defaultTheme.fontFamily.sans],
        serif: ['"IBM Plex Serif"', ...defaultTheme.fontFamily.serif],
        identity: ['"Libre Baskerville"', '"IBM Plex Serif"', ...defaultTheme.fontFamily.serif]
      },
      colors: {
        glass: 'rgba(255,253,248,0.72)',
        brand: {
          DEFAULT: '#2B4C7E',
          dark: '#182638',
          light: '#E8F0FA'
        },
        accent: '#C9A227',
        surface: '#FFFDF8'
      },
      boxShadow: {
        glass: '0 1px 1px rgba(24, 38, 56, 0.04), 0 10px 24px rgba(86, 72, 49, 0.08)'
      },
      borderRadius: {
        glass: '14px'
      }
    }
  },
  plugins: []
};

export default config;
