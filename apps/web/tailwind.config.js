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
        "arcade-tile":
          "radial-gradient(ellipse 60% 50% at 50% 10%, rgba(56,189,248,0.35), transparent 70%), linear-gradient(160deg, #075985 0%, #0c4a6e 50%, #082f49 100%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(56,189,248,0.25)",
        "glow-gold": "0 0 40px rgba(251,191,36,0.25)",
        "glow-coral": "0 0 40px rgba(244,63,94,0.3)",
        arcade:
          "0 0 0 2px rgba(250,204,21,0.6), 0 0 30px rgba(250,204,21,0.35), 0 10px 40px rgba(8,47,73,0.5)",
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
        "float-medium": {
          "0%,100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(2deg)" },
        },
        "float-reverse": {
          "0%,100%": { transform: "translateY(-6px)" },
          "50%": { transform: "translateY(4px)" },
        },
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 24px rgba(251,191,36,0.35), 0 0 0 rgba(56,189,248,0.35)" },
          "50%": { boxShadow: "0 0 60px rgba(251,191,36,0.7), 0 0 20px rgba(56,189,248,0.6)" },
        },
        "bubble-up": {
          "0%": { opacity: "0", transform: "translateY(0px) scale(0.6)" },
          "20%": { opacity: "0.9" },
          "100%": { opacity: "0", transform: "translateY(-120px) scale(1)" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(250%)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "wiggle": {
          "0%,100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        "marquee": {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "fade-out": "fade-out 0.5s ease-in 0.8s both",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "float-medium": "float-medium 4.5s ease-in-out infinite",
        "float-reverse": "float-reverse 5s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        "bubble-up": "bubble-up 4s ease-in infinite",
        "shimmer": "shimmer 2.2s linear infinite",
        "spin-slow": "spin-slow 18s linear infinite",
        "wiggle": "wiggle 2.5s ease-in-out infinite",
        "marquee": "marquee 30s linear infinite",
      },
    },
  },
  plugins: [],
};
