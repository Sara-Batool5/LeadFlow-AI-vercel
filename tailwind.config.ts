import type { Config } from "tailwindcss";

// 60 / 30 / 10 colour rule
//  60% chalk white  #F2F1EE  (backgrounds)
//  30% onyx black   #121214  (text, sidebar, dark panels)
//  10% tangerine    #FF8A1C  (accent: buttons, highlights, charts)
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        chalk: { DEFAULT: "#F2F1EE", 2: "#E7E5E0", 3: "#D9D6CF" },
        paper: "#FAF9F7",
        onyx: { DEFAULT: "#121214", 2: "#1C1C20", 3: "#2A2A30" },
        tangerine: { DEFAULT: "#FF8A1C", dark: "#E9730A", soft: "#FFE7CF" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      boxShadow: {
        soft: "0 1px 2px rgba(18,18,20,.04), 0 8px 30px rgba(18,18,20,.06)",
        glow: "0 8px 30px rgba(255,138,28,.35)",
      },
      keyframes: {
        fadeUp: { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "none" } },
        slideIn: { from: { transform: "translateX(100%)" }, to: { transform: "none" } },
        pop: { from: { opacity: "0", transform: "scale(.96)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        fadeUp: "fadeUp .6s cubic-bezier(.2,.7,.2,1) both",
        slideIn: "slideIn .3s cubic-bezier(.2,.7,.2,1) both",
        pop: "pop .2s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
