/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Gothic Mystery Palette
        primary: {
          DEFAULT: '#d4af37', // Gold
          light: '#e6c85c',
          dark: '#b8941f',
        },
        // Background layers
        'gothic': {
          darkest: '#0d1117',
          dark: '#161b26',
          mid: '#1a1f2e',
          light: '#21262d',
        },
        // Text colors
        'text': {
          gold: '#d4af37',
          light: '#c9d1d9',
          muted: '#8b949e',
          dim: '#6e7681',
        },
        // Accent colors
        'accent': {
          maroon: '#6b2e2e',
          'maroon-light': '#8b3e3e',
          navy: '#1f3554',
          olive: '#4a5a4a',
        },
      },
      backgroundImage: {
        'gothic-gradient': 'linear-gradient(135deg, #0d1117 0%, #1a1f2e 50%, #0d1117 100%)',
        'paper-texture': 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'300\' height=\'300\' filter=\'url(%23noise)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
        'vignette': 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
      },
      boxShadow: {
        'gothic': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'gold': '0 4px 15px rgba(212, 175, 55, 0.25)',
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(212, 175, 55, 0.1)',
      },
      fontFamily: {
        'cinzel': ['Cinzel', 'serif'],
        'cormorant': ['Cormorant Garamond', 'serif'],
        'lora': ['Lora', 'serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { textShadow: '0 0 10px rgba(212, 175, 55, 0.3)' },
          '100%': { textShadow: '0 0 20px rgba(212, 175, 55, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}