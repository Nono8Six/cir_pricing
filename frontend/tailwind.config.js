/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cir: {
          red: '#c13c33',
          'red-light': '#d64e44',
          'red-dark': '#a12e26',
          blue: '#F0F8FF',
          'blue-light': '#f8fcff',
        },
        border: '#e2e8f0',
        text: '#020817',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'cir': '0 4px 6px -1px rgba(193, 60, 51, 0.1), 0 2px 4px -1px rgba(193, 60, 51, 0.06)',
        'cir-lg': '0 10px 15px -3px rgba(193, 60, 51, 0.1), 0 4px 6px -2px rgba(193, 60, 51, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};