/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./types/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: {
          light: "#F9F9F9",
          dark: "#121212",
        },
        textPrimary: {
          light: "#1A1A1A",
          dark: "#F5F5DC",
        },
        textSecondary: {
          light: "#555555",
          dark: "#CCCCCC",
        },
        primary: {
          DEFAULT: "#2D9CDB",
          dark: "#1B7CB5",
        },
        secondary: {
          DEFAULT: "#27AE60",
          dark: "#1E874B",
        },
        error: {
          DEFAULT: "#EB5757",
          dark: "#C0392B",
        },
        warning: {
          DEFAULT: "#F2994A",
          dark: "#D35400",
        },
      },
    },
  },
  plugins: [],
}