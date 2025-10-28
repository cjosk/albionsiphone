import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Supremacy Siphon Track",
  description: "Team Supremacy'nin Albion Siphon enerjisi hareketlerini gerçek zamanlı izleyin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <head>
        <link rel="icon" href="https://i.hizliresim.com/mred25t.png" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-[#0e0e0e] to-[#1c1c1c] text-slate-100`}>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 md:gap-8 md:py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
