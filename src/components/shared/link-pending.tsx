"use client";

import { Loader2 } from "lucide-react";
import { useLinkStatus } from "next/link";

import { cn } from "@/lib/utils";

/**
 * Shows a spinner in place of `children` while the enclosing <Link>'s
 * navigation is pending. Used for same-route query navigations (month,
 * page, sort, program), which deliberately have no loading.tsx boundary —
 * see docs/ARCHITECTURE.md §4.2 "Navigasi query". Must render inside a <Link>.
 */
export function LinkPending({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return <>{children}</>;
  return (
    <>
      <Loader2
        className={cn("size-4 animate-spin motion-reduce:animate-none", className)}
        aria-hidden
      />
      <span className="sr-only">Memuat…</span>
    </>
  );
}
