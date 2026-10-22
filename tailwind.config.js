/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#171212', brand: '#B70021', deep: '#1A2930', mist: '#F8F6F4' },
      fontFamily: {
        sans: ['PostGrotesk', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        headline: ['TiemposHeadlineWeb', 'Georgia', 'Times', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
