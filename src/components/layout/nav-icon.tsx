"use client";

import type { LucideIcon } from "lucide-react";
import { useLinkStatus } from "next/link";

import { cn } from "@/lib/utils";

/**
 * Nav icon that pulses while its link's navigation is pending — immediate
 * feedback on slow mobile networks. Must render inside a next/link <Link>.
 */
export function NavIcon({
  icon: Icon,
  active,
  className,
}: {
  icon: LucideIcon;
  active: boolean;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  return (
    <Icon
      aria-hidden
      strokeWidth={active ? 2.25 : 1.75}
      className={cn(className, pending && "animate-pulse text-primary motion-reduce:animate-none")}
    />
  );
}
