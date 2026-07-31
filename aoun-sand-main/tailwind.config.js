/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#282449', // Logo Navy
          light: '#737088',
          dark: '#1E1B36',
        },
        secondary: {
          DEFAULT: '#F1AEA6', // Logo Peach
          light: '#F4C2BC',
          dark: '#CC938D',
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
