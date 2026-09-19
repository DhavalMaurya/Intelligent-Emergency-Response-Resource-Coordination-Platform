/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        eoc: {
          critical: '#EF4444',
          high: '#F97316',
          medium: '#F59E0B',
          low: '#10B981',
          info: '#3B82F6',
          panel: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          darkest: '#020617',
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'subtle-pulse': 'subtlePulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 15px rgba(239, 68, 68, 0.6)' },
          '50%': { opacity: 0.6, boxShadow: '0 0 5px rgba(239, 68, 68, 0.2)' },
        },
        subtlePulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.75 },
        },
      },
    },
  },
  plugins: [],
};
