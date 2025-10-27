# Albion Siphon Ledger

Minimal Next.js 15 starter configured for the App Router, Tailwind CSS, TypeScript, Firebase, and date-fns. Deploys cleanly to Vercel and runs locally with the usual Next.js scripts.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file with your Firebase configuration (see `env.example`).
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production or Vercel:
   ```bash
   npm run build
   # or
   npm run vercel-build
   ```

## Project Structure

```
app/
  globals.css      # Tailwind entry point
  layout.tsx       # Root layout applying fonts + metadata
  page.tsx         # Simple homepage placeholder
next.config.js     # Next.js configuration for Vercel
postcss.config.js  # Tailwind/PostCSS pipeline
tailwind.config.ts # Tailwind configuration
vercel.json        # Vercel project definition
```

Start extending this foundation with your guild management features as needed.
