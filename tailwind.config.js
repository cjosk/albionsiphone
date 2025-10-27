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
        "aurora-glow":
          "radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.2), transparent 60%), radial-gradient(circle at 80% 0%, rgba(236, 72, 153, 0.15), transparent 55%), radial-gradient(circle at 50% 80%, rgba(16, 185, 129, 0.12), transparent 60%)",
      },
      boxShadow: {
        glass: "0 20px 45px rgba(2, 6, 23, 0.45)",
      },
      colors: {
        "glass-border": "rgba(255, 255, 255, 0.18)",
      },
    },
  },
  plugins: [],
};
