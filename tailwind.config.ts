import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08080a",
        surface: "#0f0f13",
        raised: "#15151b",
        line: "#22222b",
        ink: "#ececf1",
        muted: "#8b8b97",
        violet: "#7c5cff",
        electric: "#2f6bff",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
