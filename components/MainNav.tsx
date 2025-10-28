"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavRoute {
  href: string;
  label: string;
}

interface MainNavProps {
  routes?: NavRoute[];
  className?: string;
}

const DEFAULT_ROUTES: NavRoute[] = [
  { href: "/", label: "🏠 Gösterge Paneli" },
  { href: "/logs", label: "📜 Kayıtlar" },
  { href: "/new", label: "➕ Yeni Kayıt" },
];

export function MainNav({ routes = DEFAULT_ROUTES, className }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-nowrap items-center gap-6 whitespace-nowrap text-sm", className)}>
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
