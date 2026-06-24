/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0F172A',      // Slate 900
          card: '#1E293B',    // Slate 800
          border: '#334155',  // Slate 700
          text: '#F8FAFC',    // Slate 50
          muted: '#94A3B8',   // Slate 400
          green: '#10B981',   // Emerald 500 (Primary accent)
          greenHover: '#059669',
          gold: '#F59E0B',    // Amber 500 (Secondary accent)
          goldHover: '#D97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
