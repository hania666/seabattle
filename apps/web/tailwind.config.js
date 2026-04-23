/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Naval blue scale (sky-like) — now complete so every `sea-XXX`
        // utility actually resolves to a colour.
        sea: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        // Warm accent for XP / victory / rewards.
        gold: {
          200: "#fef3c7",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        // Coral accent for defeat / warnings (softer than pure red).
        coral: {
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "sea-hero":
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(56,189,248,0.25), transparent 70%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(250,204,21,0.15), transparent 70%), linear-gradient(180deg, #082f49 0%, #0c4a6e 50%, #075985 100%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(56,189,248,0.25)",
        "glow-gold": "0 0 40px rgba(251,191,36,0.25)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0", visibility: "hidden" },
        },
        "float-slow": {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "fade-out": "fade-out 0.5s ease-in 0.8s both",
        "float-slow": "float-slow 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
