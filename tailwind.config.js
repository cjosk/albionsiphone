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
          "supremacy-positive": "#21f4a2",
          "supremacy-negative": "#ff4d57",
          "supremacy-border": "rgba(255, 255, 255, 0.08)",
        },
    },
  },
  plugins: [],
};
