import Link from "next/link";

import { LinkPending } from "@/components/shared/link-pending";

import { cn } from "@/lib/utils";
import type { ProgramSummary } from "@/server/services/program.service";

/** Program picker for stats/history. Hidden when the member only has one program. */
export function ProgramTabs({
  programs,
  selectedSlug,
  hrefFor,
}: {
  programs: ProgramSummary[];
  selectedSlug: string;
  /** URL for a program slug, preserving the page's other params. */
  hrefFor: (slug: string) => string;
}) {
  if (programs.length < 2) return null;

  return (
    <nav aria-label="Pilih program" className="-mx-4 mb-5 overflow-x-auto px-4">
      <ul className="flex w-max gap-2">
        {programs.map((program) => {
          const active = program.slug === selectedSlug;
          return (
            <li key={program.id}>
              <Link
                href={hrefFor(program.slug)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <LinkPending className="mr-1.5 size-3.5">{null}</LinkPending>
                {program.name}
                {!program.active && <span className="ml-1.5 text-xs">(selesai)</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
