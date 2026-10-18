/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#00f0ff',
          pink: '#ff007f',
          purple: '#9d00ff',
          yellow: '#ffe600',
          blue: '#0070f3',
          green: '#00ff88'
        },
        cyber: {
          black: '#0a0a12',
          darker: '#121220',
          dark: '#1a1a2e',
          surface: '#232338',
          border: '#32324d',
          accent: '#ff0055'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        hitEffect: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'hit': 'hitEffect 0.3s ease-out forwards',
      }
    },
  },
  plugins: [],
}
