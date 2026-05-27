/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0f14",
        panel: "#101720",
        panelSoft: "#151f2a",
        stroke: "#263241",
        muted: "#9aa7b5",
        brand: "#ff3d46",
        aqua: "#14b8a6",
        focus: "#3b82f6",
      },
      boxShadow: {
        soft: "0 22px 70px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};
