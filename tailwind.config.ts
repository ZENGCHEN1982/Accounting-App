import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#fbfaf7",
        ink: "#151517",
        muted: "#7b7b80",
        line: "#e4e4e1",
        soft: "#f2f2ef",
        brand: "#e31f1f",
        brandSoft: "#fff0f0"
      },
      boxShadow: {
        soft: "0 18px 45px -28px rgb(15 15 17 / 0.35)",
        card: "0 10px 30px -22px rgb(15 15 17 / 0.28)"
      }
    }
  },
  plugins: []
};

export default config;
