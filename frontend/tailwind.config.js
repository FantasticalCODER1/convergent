/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Tailwind configuration customizing the Convergent brand palette and typography baseline.
// TODO: Introduce theming tokens for house-specific accents in future iterations.

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
        brand: {
          DEFAULT: '#3B82F6',
          dark: '#1E40AF',
          light: '#93C5FD'
        },
        accent: '#1E40AF',
        background: '#F8FAFC'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(59, 130, 246, 0.08)'
      },
      transitionDuration: {
        250: '250ms'
      }
    }
  },
  plugins: []
};

export default config;
