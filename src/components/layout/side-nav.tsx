"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/lib/utils";

import { NavIcon } from "./nav-icon";
import { ADMIN_NAV, isNavItemActive, MEMBER_NAV, type NavItem } from "./nav-items";

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isNavItemActive(item, pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <NavIcon icon={item.icon} active={active} className="size-[18px]" />
      {item.label}
    </Link>
  );
}

export function SideNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r bg-background px-4 py-6 md:flex">
      <BrandMark className="px-2" />
      <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
        {MEMBER_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        {isAdmin && (
          <>
            <p className="mt-6 mb-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Pengurus
            </p>
            {ADMIN_NAV.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
