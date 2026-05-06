/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          DEFAULT:   '#f0f2f5',
          secondary: '#ffffff',
          card:      '#f8f9fb',
          border:    '#e2e5ea',
        },
        accent: {
          DEFAULT: '#4f6ef7',
          hover:   '#3d5ce0',
          muted:   '#4f6ef720',
        },
        text: {
          primary:   '#1a1d23',
          secondary: '#4a5068',
          muted:     '#8b92a5',
        },
      },
      animation: {
        'fade-in':  'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
        'skeleton': 'skeleton 1.5s ease infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        skeleton:{ '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
    },
  },
  plugins: [],
}
