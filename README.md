# Albion Siphon Ledger

Albion Siphon Ledger is a glassmorphism-inspired dashboard for tracking guild siphon deposits and withdrawals. The project is built with Next.js 15 (App Router), Tailwind CSS, Firebase Firestore with offline persistence, and date-fns-tz for Europe/Istanbul time handling.

## Features

- **Dashboard** – Real-time member cards summarising deposits, withdrawals, and net siphon balance with Apple Glass styling.
- **Logs** – Sortable table of every ledger entry with colour-coded reasons and formatted Istanbul timestamps.
- **New Entry Form** – Validated form for creating deposits or withdrawals, including automatic member creation and note support.
- **Firebase Integration** – Modular Firestore setup with IndexedDB caching for offline resilience.
- **Dark Mode First** – Tailwind class-based dark theme with frosted glass effects, rounded corners, and soft glows.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file with your Firebase configuration (see `env.example`).
3. Start the development server:
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
  globals.css      # Tailwind base styles and glass utilities
  layout.tsx       # Root layout with Apple Glass navigation shell
  page.tsx         # Dashboard view aggregating guild metrics
  logs/page.tsx    # Firestore-backed ledger table
  new/page.tsx     # Validated form for creating logs
components/
  GlassCard.tsx    # Reusable frosted glass container
  MainNav.tsx      # Top-level navigation links
  StatPill.tsx     # Positive/negative status pill component
lib/
  calc.ts          # Ledger aggregation helpers
  firebase.ts      # Firestore initialisation with offline cache
  time.ts          # Europe/Istanbul formatting helpers
  types.ts         # Shared TypeScript interfaces
  utils.ts         # Classname + formatting helpers
```

Happy tracking!
