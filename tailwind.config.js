/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ✅ Force dark mode classes to ALWAYS apply
  darkMode: 'class',
  
  theme: {
    extend: {
      colors: {
        // Gold/Primary colors for accents
        primary: {
          DEFAULT: '#c9a63a',
          50: '#fef7e6',
          100: '#fcefc7',
          200: '#f9df8f',
          300: '#f4c84f',
          400: '#e2c766',
          500: '#d4af37',
          600: '#c9a63a',
          700: '#b8941f',
          800: '#8b6f17',
          900: '#5d4a0f',
        },
        'gold': '#c9a63a',
        'gold-bright': '#e2c766',
        'gold-soft': '#e6c85c',
        
        // GREEN only for accents (NOT backgrounds)
        'green-fresh': '#7fb069',
        'green-bright': '#90ee90',
        
        // DARK GRAY backgrounds (like your Image 2)
        'bg-dark': {
          DEFAULT: '#1a202c',  // Main dark background
          lighter: '#2d3748',   // Cards, sections
          darker: '#171923',    // Darkest areas
        },
        
        // Text colors for dark theme
        'text-dark': {
          primary: '#ffffff',
          secondary: '#e2e8f0',
          muted: '#a0aec0',
          dim: '#718096',
        },
        
        // Legacy gothic colors (keep for backwards compatibility)
        'gothic-darkest': '#171923',
        'gothic-dark': '#1a202c',
        'gothic-mid': '#2d3748',
        'gothic-light': '#4a5568',
        
        'forest-darkest': '#171923',
        'forest-dark': '#1a202c',
        'forest-mid': '#2d3748',
        'forest-light': '#4a5568',
        
        'text-light': '#ffffff',
        'text-muted': '#e2e8f0',
        'text-dim': '#a0aec0',
        'text-gold': '#e2c766',
        
        'cream': '#faf8f3',
        'cream-dark': '#e8e4da',
        
        'accent-maroon': {
          DEFAULT: '#8b3e3e',
          light: '#a85454',
          dark: '#6b2e2e',
        },
      },
      backgroundImage: {
        'gothic-gradient': 'linear-gradient(135deg, #171923 0%, #1a202c 40%, #2d3748 100%)',
      },
      boxShadow: {
        'gothic': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'gold': '0 6px 25px rgba(212, 175, 55, 0.5)',
        'gold-glow': '0 0 40px rgba(212, 175, 55, 0.2)',
      },
      fontFamily: {
        'cinzel': ['Cinzel', 'serif'],
        'cormorant': ['Cormoant Garamond', 'serif'],
        'lora': ['Lora', 'serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}