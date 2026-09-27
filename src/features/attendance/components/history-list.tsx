import { formatDateWithWeekday, formatTimeInTz } from "@/lib/date";

import type { DayCell } from "../lib/stats";

import { StatusBadge } from "./status-badge";

/** Tanggal | Status, newest first. Only days that count (reported, missed or today). */
export function HistoryList({ days }: { days: DayCell[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Tanggal
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {days.map((day) => (
            <tr key={day.key} className="align-top">
              <td className="px-4 py-3">
                <div className="font-medium">{formatDateWithWeekday(day.date)}</div>
                {day.activity?.createdAt && (
                  <div className="text-xs text-muted-foreground">
                    Dilaporkan {formatTimeInTz(day.activity.createdAt)} WIB
                  </div>
                )}
                {day.activity?.notes && (
                  <div className="mt-1 text-xs text-muted-foreground italic">
                    &ldquo;{day.activity.notes}&rdquo;
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <StatusBadge state={day.state} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
