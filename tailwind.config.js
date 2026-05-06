/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        bg: { DEFAULT: '#0a0a0b', secondary: '#111114', card: '#18181c', border: '#27272d' },
        accent: { DEFAULT: '#6366f1', hover: '#4f52d9', muted: '#6366f120' },
        text: { primary: '#f4f4f5', secondary: '#a1a1aa', muted: '#52525b' },
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
        'skeleton': 'skeleton 1.5s ease infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        skeleton: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
    },
  },
  plugins: [],
}
