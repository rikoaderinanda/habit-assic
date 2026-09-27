import { CheckCircle2 } from "lucide-react";

import { formatTimeInTz } from "@/lib/date";
import { cn } from "@/lib/utils";

import type { ActivityRecord } from "@/server/services/activity.service";

import { StatusBadge } from "./status-badge";

/** "Anda sudah mengisi laporan hari ini" state. */
export function SubmittedCard({
  activity,
  className,
}: {
  activity: ActivityRecord;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-primary/20 bg-primary/5 px-6 py-8 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/30">
        <CheckCircle2 className="size-7" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold">Anda sudah mengisi laporan hari ini</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Dikirim pukul {formatTimeInTz(activity.createdAt)} WIB
      </p>
      <StatusBadge state={activity.status} className="mt-4 px-3 py-1 text-sm" />
      {activity.notes && (
        <p className="mt-4 max-w-sm rounded-xl bg-background px-4 py-3 text-sm text-muted-foreground italic">
          &ldquo;{activity.notes}&rdquo;
        </p>
      )}
    </div>
  );
}
