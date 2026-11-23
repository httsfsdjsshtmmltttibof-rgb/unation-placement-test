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
          red: '#C41230',
          'red-dark': '#A00E26',
          'red-light': '#FFF1F2',
          dark: '#111827',
          gold: '#C9A050',
          'gold-light': '#FBF6E9',
          'gold-dark': '#9A7428',
          border: '#E5E7EB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'premium': '0 10px 30px -4px rgba(196, 18, 48, 0.1)',
        'card': '0 2px 12px 0 rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
