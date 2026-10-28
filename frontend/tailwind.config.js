/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        navy: {
          50: '#F0F4F9',
          100: '#E1E9F3',
          200: '#C2D3E7',
          300: '#94B4D5',
          400: '#5F8EBE',
          500: '#386DA6',
          600: '#285487',
          700: '#20436C',
          800: '#182B49', // Deep navy specified by user
          850: '#14233C',
          900: '#111A2E',
          950: '#0B111E',
        },
        cobalt: {
          50: '#EFF4FF',
          100: '#DBE6FE',
          200: '#BFD3FE',
          300: '#93B7FD',
          400: '#6092FA',
          500: '#4169E1', // Cobalt blue specified by user
          600: '#3457C7',
          700: '#2744A3',
          800: '#233B84',
          900: '#20346E',
          950: '#131F43',
        },
        surface: {
          light: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          'dark-bg': '#0B111E',
          'dark-card': '#111A2E',
          'dark-card-hover': '#15223B',
          'dark-border': '#1E2D4A',
        }
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
        'dropdown': '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
      }
    },
  },
  plugins: [],
}
