/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0D1117',
        surface: '#161B22',
        surface2: '#21262D',
        border: '#30363D',
        accent: {
          green: '#238636',
          blue: '#1F6FEB',
          amber: '#D29922',
          red: '#DA3633',
          purple: '#BC8CFF',
        },
        text: {
          primary: '#E6EDF3',
          muted: '#8B949E',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
      },
    },
  },
  plugins: [],
}
