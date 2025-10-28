"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const LOGO_URL = "https://i.hizliresim.com/mred25t.png";

const PRIMARY_LINKS = [
  { href: "/", label: "🏠 Gösterge Paneli" },
  { href: "/logs", label: "📜 Kayıtlar" },
  { href: "/new", label: "➕ Yeni Kayıt" },
];

const ADMIN_LINK = { href: "/admin", label: "⚙️ Yönetim" };

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  const renderLink = (route: { href: string; label: string }) => {
    const isActive = route.href === "/" ? pathname === "/" : pathname?.startsWith(route.href);
    return (
      <Link
        key={route.href}
        href={route.href}
        className={cn(
          "nav-link",
          "w-full justify-start text-sm md:w-auto",
          isActive ? "border-supremacy-border bg-white/10 text-white" : "text-slate-200",
        )}
        data-active={isActive}
        onClick={closeMenu}
      >
        {route.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-supremacy-border/60 bg-black/80 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 md:px-6">
        <div className="flex flex-1 items-center justify-start">
          <button
            type="button"
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-supremacy-border bg-[#1a1a1a] text-slate-100 transition hover:border-supremacy-primary md:hidden"
          >
            <span className="sr-only">Menü</span>
            <div className="relative h-4 w-4">
              <span
                className={cn(
                  "absolute left-0 block h-0.5 w-full rounded bg-slate-100 transition", 
                  open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 block h-0.5 w-full rounded bg-slate-100 transition", 
                  open ? "opacity-0" : "top-1/2 -translate-y-1/2",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 block h-0.5 w-full rounded bg-slate-100 transition", 
                  open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0",
                )}
              />
            </div>
          </button>
          <nav className="hidden flex-1 items-center gap-6 whitespace-nowrap md:flex">
            {PRIMARY_LINKS.map((route) => renderLink(route))}
          </nav>
        </div>

        <div className="flex shrink-0 justify-center">
          <Link href="/" className="inline-flex items-center justify-center" aria-label="Ana sayfa">
            <img src={LOGO_URL} alt="Team Supremacy logosu" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end">
          <nav className="hidden flex-nowrap items-center gap-6 whitespace-nowrap md:flex">
            {renderLink(ADMIN_LINK)}
          </nav>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden"
          >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pb-4">
              {[...PRIMARY_LINKS, ADMIN_LINK].map((route) => (
                <div key={route.href}>{renderLink(route)}</div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

export default Navbar;
