import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";
import type { CurrentUser } from "@/server/guards";

import { BottomNav } from "./bottom-nav";
import { SideNav } from "./side-nav";
import { UserMenu } from "./user-menu";

/** Signed-in chrome: sidebar on desktop, top bar + bottom navigation on mobile. */
export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-dvh bg-background md:flex">
      <a
        href="#konten"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Lewati ke konten
      </a>
      <SideNav isAdmin={isAdmin} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 md:h-16 md:justify-end md:px-8">
            <Link href="/dashboard" className="md:hidden" aria-label="Beranda">
              <BrandMark className="[&_span:first-child]:size-8 [&_span:last-child]:text-base" />
            </Link>
            <UserMenu name={user.name} email={user.email} image={user.image} isAdmin={isAdmin} />
          </div>
        </header>

        <main
          id="konten"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none md:px-8 md:pt-8 md:pb-12"
        >
          {children}
        </main>
      </div>

      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
