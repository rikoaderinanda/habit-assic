"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { NavIcon } from "./nav-icon";
import { ADMIN_NAV, isNavItemActive } from "./nav-items";

/** Admin section switcher on mobile (desktop uses the sidebar). */
export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu admin" className="mb-5 md:hidden">
      <ul className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {ADMIN_NAV.map((item) => {
          const active = isNavItemActive(item, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
                  active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground",
                )}
              >
                <NavIcon icon={item.icon} active={active} className="size-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
