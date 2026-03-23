/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0f172a',
          charcoal: '#1e293b',
          steel: '#334155',
          gold: '#f59e0b',
          'gold-light': '#fbbf24',
          'gold-dark': '#d97706',
          amber: '#f59e0b',
        },
        surface: {
          DEFAULT: '#0f172a',
          raised: '#1e293b',
          overlay: '#334155',
          subtle: '#1a2332',
        },
        accent: {
          DEFAULT: '#f59e0b',
          hover: '#fbbf24',
          muted: 'rgba(245, 158, 11, 0.15)',
        },
        success: {
          DEFAULT: '#10b981',
          muted: 'rgba(16, 185, 129, 0.15)',
        },
        danger: {
          DEFAULT: '#f43f5e',
          muted: 'rgba(244, 63, 94, 0.15)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          muted: 'rgba(245, 158, 11, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter'],
        display: ['InterBold'],
      },
    },
  },
  plugins: [],
};
