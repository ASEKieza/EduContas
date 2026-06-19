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
        // Marca — teal-petróleo (design system brand)
        brand: {
          50:  "#E8F3F4",
          100: "#C5E2E5",
          200: "#93C8CE",
          300: "#5BA8B2",
          400: "#2E8794",
          500: "#136B79",
          600: "#0E5560",
          700: "#0C434C",
          800: "#0B363E",
          900: "#0A2C33",
          950: "#081E24",
        },
        // Acento — ouro sóbrio (design system accent)
        gold: {
          50:  "#FFFBEA",
          100: "#FFF3C3",
          200: "#F3E7A0",
          300: "#F3CD72",
          400: "#E8B339",
          500: "#C9941A",
          600: "#9E7212",
          700: "#7A5609",
          800: "#5C4007",
          900: "#3D2B04",
          950: "#201602",
        },
        // Neutros — slate frio (design system slate → mantém classes ink-* existentes)
        ink: {
          50:  "#F7F9FA",
          100: "#EEF2F4",
          200: "#E1E8EB",
          300: "#CBD6DB",
          400: "#94A6AE",
          500: "#637680",
          600: "#485961",
          700: "#33424A",
          800: "#1E2B31",
          900: "#11191D",
          950: "#0D2730",
        },
        // Água/Teal — mantido para componentes existentes
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
      },
      fontFamily: {
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
        sans:    ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono:    ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        sm:   "6px",
        DEFAULT: "6px",
        md:   "10px",
        lg:   "14px",
        xl:   "20px",
        "2xl": "20px",
        full: "9999px",
      },
      boxShadow: {
        sm:      "0 1px 2px rgba(17,25,29,.06), 0 1px 1px rgba(17,25,29,.04)",
        md:      "0 4px 12px rgba(17,25,29,.08), 0 2px 4px rgba(17,25,29,.05)",
        lg:      "0 12px 28px rgba(17,25,29,.12), 0 6px 10px rgba(17,25,29,.06)",
        xl:      "0 24px 50px rgba(17,25,29,.18)",
        card:    "0 1px 2px rgba(17,25,29,.06), 0 1px 1px rgba(17,25,29,.04)",
        "card-md": "0 4px 12px rgba(17,25,29,.08), 0 2px 4px rgba(17,25,29,.05)",
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
