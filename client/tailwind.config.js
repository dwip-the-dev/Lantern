/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#06070a',
          900: '#0b0e14',
          850: '#0e1219',
          800: '#111722',
          700: '#1b2333',
          600: '#283347'
        },
        lantern: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          glow: '#ffaa00'
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          glow: '#059669'
        }
      },
      boxShadow: {
        'lantern': '0 0 25px -5px rgba(245, 158, 11, 0.35)',
        'lantern-lg': '0 0 50px -10px rgba(245, 158, 11, 0.45)',
        'lantern-glow': '0 0 40px rgba(245, 158, 11, 0.2), 0 0 80px rgba(245, 158, 11, 0.1)',
        'emerald-glow': '0 0 20px -3px rgba(16, 185, 129, 0.4)',
        'inner-dark': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.6)',
        'cinema': '0 20px 60px -10px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 16px 40px -8px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.08)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace']
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem'
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both'
      }
    },
  },
  plugins: [],
}
