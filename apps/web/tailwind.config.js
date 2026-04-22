/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sea: {
          50: "#eefaff",
          100: "#d9f1ff",
          500: "#0284c7",
          700: "#0369a1",
          900: "#0c2d48",
          950: "#071a2b",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
