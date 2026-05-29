/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        // Warm stone zinc (darkroom panels)
        zinc: {
          '50': '#f7f6f3',
          '100': '#eceae5',
          '200': '#d9d6cf',
          '300': '#c4c0b7',
          '400': '#a39e93',
          '500': '#868079',
          '600': '#6b6560',
          '700': '#544f4a',
          '800': '#3a3632',
          '900': '#272422',
          '950': '#1a1917',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          '50': '#f7f6f3',
          '100': '#eceae5',
          '200': '#e3e0d8',
          '300': '#d9d6cf',
          '400': '#c4c0b7',
        },
        border: {
          DEFAULT: '#d9d6cf',
          strong: '#c4c0b7',
          subtle: '#eceae5',
        },
        text: {
          primary: '#1a1917',
          secondary: '#544f4a',
          muted: '#868079',
          placeholder: '#a39e93',
        },
        accent: {
          DEFAULT: '#C9A962',
          light: '#F5EDD8',
          hover: '#B89852',
          muted: 'rgba(201, 169, 98, 0.15)',
        },
        film: {
          DEFAULT: '#C9A962',
          light: '#F5EDD8',
          muted: 'rgba(201, 169, 98, 0.15)',
        },
        canvas: '#1a1917',
        danger: '#DC2626',
        success: '#22C55E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
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
        'panel': '0 1px 3px 0 rgba(26, 25, 23, 0.06), 0 1px 2px -1px rgba(26, 25, 23, 0.06)',
        'panel-lg': '0 4px 16px 0 rgba(26, 25, 23, 0.1)',
        'preset': '0 2px 8px 0 rgba(26, 25, 23, 0.08)',
        'preset-active': '0 0 0 2px #C9A962',
        'inner-sm': 'inset 0 1px 2px rgba(26, 25, 23, 0.06)',
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
