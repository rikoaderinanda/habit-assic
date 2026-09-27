import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { LinkPending } from "@/components/shared/link-pending";

import { Button } from "@/components/ui/button";

/** Page numbers with gaps: 1 … 4 5 6 … 12 */
function pageWindow(page: number, pageCount: number): Array<number | "gap"> {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function PagePagination({
  page,
  pageCount,
  total,
  pageSize,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Halaman"
      className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        Menampilkan {from}–{to} dari {total} anggota
      </p>
      {pageCount > 1 && (
        <ul className="flex items-center gap-1">
          <li>
            <Button
              asChild={page > 1}
              variant="ghost"
              size="icon"
              className="size-11 sm:size-9"
              disabled={page <= 1}
              aria-label={page > 1 ? undefined : "Halaman sebelumnya"}
            >
              {page > 1 ? (
                <Link href={hrefFor(page - 1)} aria-label="Halaman sebelumnya" scroll={false}>
                  <LinkPending>
                    <ChevronLeft aria-hidden />
                  </LinkPending>
                </Link>
              ) : (
                <span aria-hidden>
                  <ChevronLeft />
                </span>
              )}
            </Button>
          </li>
          {pageWindow(page, pageCount).map((p, i) =>
            p === "gap" ? (
              <li key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden>
                …
              </li>
            ) : (
              <li key={p}>
                <Button
                  asChild
                  variant={p === page ? "default" : "ghost"}
                  size="icon"
                  className="size-11 tabular-nums sm:size-9"
                >
                  <Link
                    href={hrefFor(p)}
                    aria-current={p === page ? "page" : undefined}
                    scroll={false}
                  >
                    <LinkPending>{p}</LinkPending>
                  </Link>
                </Button>
              </li>
            ),
          )}
          <li>
            <Button
              asChild={page < pageCount}
              variant="ghost"
              size="icon"
              className="size-11 sm:size-9"
              disabled={page >= pageCount}
              aria-label={page < pageCount ? undefined : "Halaman berikutnya"}
            >
              {page < pageCount ? (
                <Link href={hrefFor(page + 1)} aria-label="Halaman berikutnya" scroll={false}>
                  <LinkPending>
                    <ChevronRight aria-hidden />
                  </LinkPending>
                </Link>
              ) : (
                <span aria-hidden>
                  <ChevronRight />
                </span>
              )}
            </Button>
          </li>
        </ul>
      )}
    </nav>
  );
}
