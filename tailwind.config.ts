import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "rgb(38 38 38)",
        lavender: {
          300: "var(--lavender-300)",
          400: "var(--lavender-400)",
          500: "var(--lavender-500)",
          900: "var(--lavender-900)",
        },
      },
    },
  },
} satisfies Config

export default config
