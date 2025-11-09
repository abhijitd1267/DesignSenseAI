const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#007BFF",
        accent: "#00E6A8",
        secondary: "#A46BF5",
        background: "#F9FAFB",
        negative: "#FF5252",
        neutral: "#FFC107",
        positive: "#00E676",
      },
      fontFamily: {
        sans: ["Poppins", "Inter", ...defaultTheme.fontFamily.sans],
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 20px 40px -20px rgba(15, 23, 42, 0.25)",
      },
    },
  },
  plugins: [],
};
