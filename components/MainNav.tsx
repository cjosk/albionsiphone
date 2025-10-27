"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routes = [
  { href: "/", label: "🏠 Gösterge Paneli" },
  { href: "/logs", label: "📜 Kayıtlar" },
  { href: "/new", label: "➕ Yeni Kayıt" },
  { href: "/admin", label: "⚙️ Yönetim" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-3 text-sm">
      {routes.map((route) => {
        const isActive = route.href === "/" ? pathname === "/" : pathname?.startsWith(route.href);
        return (
          <Link key={route.href} href={route.href} className="nav-link" data-active={isActive}>
            {route.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default MainNav;
