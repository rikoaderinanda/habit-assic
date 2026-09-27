import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";
import Link from "next/link";

import { LinkPending } from "@/components/shared/link-pending";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { MonitoringRow, SortDir, SortKey } from "../lib/monitoring";

type Props = {
  rows: MonitoringRow[];
  sort: SortKey;
  dir: SortDir;
  /** Builds a URL with the given params merged into the current ones. */
  hrefWith: (params: Record<string, string | undefined>) => string;
  detailQuery: string;
};

function SortHeader({
  label,
  column,
  sort,
  dir,
  hrefWith,
  align = "right",
  className,
}: {
  label: string;
  column: SortKey;
  align?: "left" | "right";
  className?: string;
} & Pick<Props, "sort" | "dir" | "hrefWith">) {
  const active = sort === column;
  // First click on a numeric column sorts high→low; name starts A→Z.
  const nextDir: SortDir = active
    ? dir === "asc"
      ? "desc"
      : "asc"
    : column === "name"
      ? "asc"
      : "desc";
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(
        "px-3 py-2.5 font-medium whitespace-nowrap",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      <Link
        href={hrefWith({ sort: column, dir: nextDir, page: undefined })}
        scroll={false}
        className={cn(
          "inline-flex items-center gap-1 rounded-md transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <LinkPending className="size-3.5">
          <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
        </LinkPending>
      </Link>
    </th>
  );
}

function PercentageBar({ value }: { value: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block" aria-hidden>
        <div className="h-full rounded-full bg-chart-1" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right font-semibold tabular-nums">{value}%</span>
    </div>
  );
}

/** Nama | Total Input | Jamaah | Sendiri | Persentase — sortable via URL. */
export function MonitoringTable({ rows, sort, dir, hrefWith, detailQuery }: Props) {
  return (
    // `relative` makes this scroll box the containing block of the rows' stretched links,
    // so they are clipped with the table instead of widening the page.
    <div className="relative overflow-x-auto rounded-2xl border bg-card shadow-xs">
      <table className="w-full text-sm lg:min-w-[36rem]">
        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <SortHeader
              label="Nama"
              column="name"
              align="left"
              sort={sort}
              dir={dir}
              hrefWith={hrefWith}
            />
            <SortHeader label="Input" column="input" sort={sort} dir={dir} hrefWith={hrefWith} />
            <SortHeader
              label="Jamaah"
              column="jamaah"
              sort={sort}
              dir={dir}
              hrefWith={hrefWith}
              className="hidden lg:table-cell"
            />
            <SortHeader
              label="Sendiri"
              column="sendiri"
              sort={sort}
              dir={dir}
              hrefWith={hrefWith}
              className="hidden lg:table-cell"
            />
            <SortHeader
              label="Persentase"
              column="percentage"
              sort={sort}
              dir={dir}
              hrefWith={hrefWith}
            />
            <th scope="col" className="hidden w-8 lg:table-cell">
              <span className="sr-only">Detail</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.id} className="group relative transition-colors hover:bg-muted/40">
              <td className="w-full max-w-0 px-3 py-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={row.name}
                    email={row.email}
                    image={row.image}
                    className="size-9"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/admin/members/${row.id}${detailQuery}`}
                      // 20 rows per page: prefetching every detail page floods the server.
                      prefetch={false}
                      className="block truncate font-medium after:absolute after:inset-0"
                    >
                      {row.name ?? row.email}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground lg:flex-nowrap lg:truncate">
                      {row.name && <span className="hidden truncate lg:inline">{row.email}</span>}
                      <span className="lg:hidden">
                        {row.jamaah} jamaah · {row.sendiri} sendiri
                      </span>
                      {row.role === "ADMIN" && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                {row.totalInput}
                <span className="text-muted-foreground">/{row.effectiveDays}</span>
              </td>
              <td className="hidden px-3 py-3 text-right tabular-nums lg:table-cell">
                {row.jamaah}
              </td>
              <td className="hidden px-3 py-3 text-right tabular-nums lg:table-cell">
                {row.sendiri}
              </td>
              <td className="px-3 py-3">
                <PercentageBar value={row.percentage} />
              </td>
              <td className="hidden pr-3 text-muted-foreground lg:table-cell">
                <ChevronRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
