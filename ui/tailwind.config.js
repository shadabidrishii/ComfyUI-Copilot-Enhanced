/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        bounce: 'bounce 1s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

