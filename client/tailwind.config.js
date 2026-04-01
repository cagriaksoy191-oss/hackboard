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
        bg: {
          DEFAULT: '#0a0a0f',
          light: '#f8fafc',
        },
        card: {
          DEFAULT: '#1a1a2e',
          light: '#ffffff',
        },
        cardAlt: {
          DEFAULT: '#16213e',
          light: '#f1f5f9',
        },
        accent: '#00d4ff',
        accentAlt: '#7c3aed',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
