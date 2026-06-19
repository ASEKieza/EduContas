import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Angola Red — primary CTAs, active states
        brand: {
          50:  "#fff0f0",
          100: "#ffe0e0",
          200: "#ffc5c5",
          300: "#ff9898",
          400: "#ff5555",
          500: "#f51818",
          600: "#e00010",
          700: "#c00010",
          800: "#9d0710",
          900: "#820c14",
          950: "#450006",
        },
        // Ouro/Amarelo — accents, KPI highlights, premium feel
        gold: {
          50:  "#fffbea",
          100: "#fff3c3",
          200: "#ffe282",
          300: "#ffcc42",
          400: "#ffb808",
          500: "#df9800",
          600: "#b87400",
          700: "#8d5402",
          800: "#734210",
          900: "#603713",
          950: "#381c05",
        },
        // Água/Teal — digital/tech, info, secondary actions
        aqua: {
          50:  "#ecfeff",
          100: "#cefafe",
          200: "#a4f4fc",
          300: "#61e8f8",
          400: "#18d4ec",
          500: "#00b5cc",
          600: "#0291a8",
          700: "#097384",
          800: "#105c6c",
          900: "#124d5c",
          950: "#063240",
        },
        // Tinta/Preto — sidebar, dark elements
        ink: {
          50:  "#f5f5f7",
          100: "#ecedef",
          200: "#d7d8de",
          300: "#b6b8c3",
          400: "#8e91a2",
          500: "#717487",
          600: "#5c5f72",
          700: "#4b4e5e",
          800: "#3d3f4e",
          900: "#1a1c28",
          950: "#0d0e18",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        "card":    "0 1px 4px 0 rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)",
        "card-md": "0 4px 16px 0 rgba(0,0,0,.10), 0 0 0 1px rgba(0,0,0,.04)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow":  "spin 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
