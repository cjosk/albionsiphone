import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { MainNav } from "@/components/MainNav";
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
      <body className={`${inter.className} min-h-screen text-slate-100`}>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b border-supremacy-border/60 bg-black/70 backdrop-blur-2xl">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
              <div className="flex flex-1 items-center justify-start">
                <MainNav className="flex flex-nowrap items-center gap-6 whitespace-nowrap overflow-x-auto" />
              </div>
              <div className="flex flex-1 justify-center">
                <Link href="/" className="inline-flex items-center justify-center" aria-label="Supremacy ana sayfa">
                  <img
                    src="https://i.hizliresim.com/mred25t.png"
                    alt="Team Supremacy logo"
                    className="h-10 w-auto"
                  />
                </Link>
              </div>
              <div className="flex flex-1 items-center justify-end">
                <MainNav
                  routes={[{ href: "/admin", label: "⚙️ Yönetim" }]}
                  className="flex flex-nowrap items-center gap-6 whitespace-nowrap overflow-x-auto"
                />
              </div>
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
