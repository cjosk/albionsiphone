/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "supremacy-gradient": "linear-gradient(135deg, #0e0e0e 0%, #1c1c1c 100%)",
      },
      boxShadow: {
        glass: "0 28px 60px rgba(0, 0, 0, 0.45)",
      },
      colors: {
        "supremacy-primary": "#ffc107",
        "supremacy-primary-hover": "#ffce32",
        "supremacy-positive": "#00e676",
        "supremacy-negative": "#ff5252",
        "supremacy-surface": "#161616",
        "supremacy-border": "#2a2a2a",
        "supremacy-text": "#f5f5f5",
        "supremacy-muted": "#9ca3af",
      },
    },
  },
  plugins: [],
};
