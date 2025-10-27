"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routes = [
  { href: "/", label: "Dashboard" },
  { href: "/logs", label: "Logs" },
  { href: "/new", label: "New Entry" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2">
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
