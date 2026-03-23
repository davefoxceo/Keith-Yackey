import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0f172a",
          charcoal: "#1e293b",
          steel: "#334155",
          gold: "#f59e0b",
          "gold-light": "#fbbf24",
          "gold-dark": "#d97706",
          amber: "#f59e0b",
        },
        surface: {
          DEFAULT: "#0f172a",
          raised: "#1e293b",
          overlay: "#334155",
          subtle: "#1a2332",
        },
        accent: {
          DEFAULT: "#f59e0b",
          hover: "#fbbf24",
          muted: "rgba(245, 158, 11, 0.15)",
        },
        success: {
          DEFAULT: "#10b981",
          muted: "rgba(16, 185, 129, 0.15)",
        },
        danger: {
          DEFAULT: "#f43f5e",
          muted: "rgba(244, 63, 94, 0.15)",
        },
        warning: {
          DEFAULT: "#f59e0b",
          muted: "rgba(245, 158, 11, 0.15)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-up": "fadeUp 0.6s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "slide-in-left": "slideInLeft 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
        "flame": "flame 0.5s ease-in-out infinite alternate",
        "glow": "glow 2s ease-in-out infinite alternate",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(245, 158, 11, 0.6)" },
        },
        flame: {
          "0%": { transform: "scale(1) rotate(-2deg)" },
          "100%": { transform: "scale(1.1) rotate(2deg)" },
        },
        glow: {
          "0%": { textShadow: "0 0 10px rgba(245, 158, 11, 0.5)" },
          "100%": { textShadow: "0 0 20px rgba(245, 158, 11, 0.8), 0 0 40px rgba(245, 158, 11, 0.3)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gold-gradient": "linear-gradient(135deg, #f59e0b, #d97706)",
        "dark-gradient": "linear-gradient(180deg, #0f172a, #1e293b)",
        "card-gradient": "linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
