import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { MainNav } from "@/components/MainNav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Albion Siphon Ledger",
  description: "Real-time Albion Online siphon tracker for guild managers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen text-slate-100`}>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
              <Link href="/" className="text-lg font-semibold text-white transition hover:text-emerald-300">
                Albion Siphon Ledger
              </Link>
              <MainNav />
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">{children}</main>
          <footer className="border-t border-white/10 bg-slate-950/60 py-6 text-sm text-slate-400 backdrop-blur">
            <div className="mx-auto w-full max-w-6xl px-6">
              © {new Date().getFullYear()} Albion Siphon Tracker. Built with Next.js & Firebase.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
