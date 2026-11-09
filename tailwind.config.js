/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Public Sans", "sans-serif"] },
      colors: {
        sidebar: { bg: "#1e1f29", active: "#272936", text: "#98a6ad", hover: "#2d303e", title: "#50586c" },
        brand: { blue: "#2563eb", lightBg: "#f3f5f9", cardBg: "#ffffff" },
      },
    },
  },
  plugins: [],
};
