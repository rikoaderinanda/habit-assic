import { MoonStar } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  withName = true,
}: {
  className?: string;
  withName?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
        <MoonStar className="size-5" aria-hidden />
      </span>
      {withName && <span className="text-lg font-semibold tracking-tight">Subuh Tracker</span>}
    </div>
  );
}
