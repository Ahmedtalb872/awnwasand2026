/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#241D5D', // Logo Navy, enriched
          light: '#716C96',
          dark: '#1C1749',
        },
        secondary: {
          DEFAULT: '#F6A197', // Logo Peach, enriched
          light: '#F8B8B1',
          dark: '#D18980',
        },
      },
      fontFamily: {
        arabic: ['Cairo', 'Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
