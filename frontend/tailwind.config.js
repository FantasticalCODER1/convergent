import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Nunito Sans"', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        glass: 'rgba(255,255,255,0.08)',
        brand: {
          DEFAULT: '#6366F1',
          dark: '#4F46E5',
          light: '#A5B4FC'
        },
        accent: '#22D3EE',
        surface: '#0F172A'
      },
      boxShadow: {
        glass: '0 15px 45px rgba(15, 23, 42, 0.35)'
      },
      borderRadius: {
        glass: '28px'
      }
    }
  },
  plugins: []
};

export default config;
