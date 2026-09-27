import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading skeletons shaped like the pages they stand in for (no layout jump).
 * Only for routes without same-route query navigation — see LinkPending.
 */

function Busy({ children }: { children: React.ReactNode }) {
  return (
    <div aria-busy="true" aria-label="Memuat…" className="animate-in duration-300 fade-in">
      {children}
    </div>
  );
}

function HeaderSkeleton({ withSwitcher = true }: { withSwitcher?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-4 w-56 rounded-md" />
      </div>
      {withSwitcher && <Skeleton className="h-11 w-56 rounded-xl sm:h-10" />}
    </div>
  );
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Busy>
      <HeaderSkeleton />
      <Skeleton className="mb-3 h-4 w-48 rounded-md" />
      <div className="overflow-hidden rounded-2xl border">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b px-4 py-3.5 last:border-0"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-44 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

export function FormSkeleton() {
  return (
    <Busy>
      <div className="mx-auto max-w-lg">
        <HeaderSkeleton withSwitcher={false} />
        <div className="space-y-5 rounded-2xl border p-5 sm:p-6">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-5 w-48 rounded-md" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>
    </Busy>
  );
}
