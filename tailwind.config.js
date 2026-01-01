/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bc-blue': '#00539C',
        'bc-dark': '#1a1a2e',
        'bc-accent': '#4ECDC4',
      },
    },
  },
  plugins: [],
};
