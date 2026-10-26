/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        printq: {
          dark: {
            bg: '#0B0A1A',
            card: '#15142B',
            border: '#2A284D',
            primary: '#4F46E5',
            primaryHover: '#6366F1',
            text: '#FFFFFF',
            textSecondary: '#94A3B8',
          },
          light: {
            bg: '#F8FAFC',
            card: '#FFFFFF',
            border: '#E2E8F0',
            primary: '#4338CA',
            primaryHover: '#3730A3',
            text: '#0F172A',
            textSecondary: '#64748B',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
