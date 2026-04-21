/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        // Frescava white/fresh palette
        surface: {
          DEFAULT: '#FFFFFF',
          '50': '#FAFAFA',
          '100': '#F5F5F5',
          '200': '#EFEFEF',
          '300': '#E8E8E8',
          '400': '#D4D4D4',
        },
        border: {
          DEFAULT: '#E8E8E8',
          strong: '#D0D0D0',
          subtle: '#F0F0F0',
        },
        text: {
          primary: '#111111',
          secondary: '#555555',
          muted: '#999999',
          placeholder: '#BBBBBB',
        },
        accent: {
          DEFAULT: '#2563eb',
          light: '#EEF3FF',
          hover: '#1d4ed8',
          muted: 'rgba(37, 99, 235, 0.12)',
        },
        // Warm film accent for preset highlights
        film: {
          DEFAULT: '#C4873A',
          light: '#FDF5EC',
          muted: 'rgba(196, 135, 58, 0.15)',
        },
        // Canvas background (slightly off-white like a light box)
        canvas: '#F2F2F2',
        danger: '#EF4444',
        success: '#22C55E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        kenoky: ['Kenoky', 'sans-serif'],
        coffekan: ['Coffekan', 'serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'panel': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'panel-lg': '0 4px 16px 0 rgba(0,0,0,0.08)',
        'preset': '0 2px 8px 0 rgba(0,0,0,0.10)',
        'preset-active': '0 0 0 2px #2563eb',
        'inner-sm': 'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'spin-slow': 'spin 1.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      spacing: {
        'titlebar': '32px',
      }
    },
  },
  plugins: [],
}
