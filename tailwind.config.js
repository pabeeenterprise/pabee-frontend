/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: '#f7f8fa',
        panel: '#ffffff',
        'panel-soft': '#f0f3f6',
        text: '#1d252d',
        muted: '#66717d',
        faint: '#8b96a3',
        line: '#dfe4ea',
        blue: { DEFAULT: '#1f6feb', soft: '#e8f1ff' },
        green: { DEFAULT: '#148a4c', soft: '#e6f6ee' },
        amber: { DEFAULT: '#a76512', soft: '#fff2df' },
        red: { DEFAULT: '#c4362e', soft: '#fdebea' },
      },
      borderRadius: { DEFAULT: '8px' }
    },
  },
  plugins: [],
}