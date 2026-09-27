import type { ActivityStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  computeJamaahStreak,
  computeMonthlyStats,
  percentageOf,
  weeklyBuckets,
  type ActivityLike,
} from "@/features/attendance/lib/stats";
import { parseDateKey } from "@/lib/date";

const d = (key: string) => parseDateKey(key);
const sep = { year: 2026, month: 9 };

function acts(entries: Record<string, ActivityStatus>): ActivityLike[] {
  return Object.entries(entries).map(([day, status]) => ({ date: d(`2026-09-${day}`), status }));
}

function range(from: number, to: number, status: ActivityStatus): Record<string, ActivityStatus> {
  const out: Record<string, ActivityStatus> = {};
  for (let i = from; i <= to; i++) out[String(i).padStart(2, "0")] = status;
  return out;
}

describe("computeMonthlyStats", () => {
  it("reproduces the brief's example: 30 days, 25 jamaah, 4 sendiri, 1 missed → 83%", () => {
    const activities = acts({ ...range(1, 25, "JAMAAH"), ...range(26, 29, "SENDIRI") });
    const s = computeMonthlyStats({ month: sep, today: d("2026-10-02"), activities });

    expect(s).toMatchObject({
      daysInMonth: 30,
      effectiveDays: 30,
      jamaah: 25,
      sendiri: 4,
      missed: 1,
      percentage: 83,
    });
    expect(s.days[29].state).toBe("MISSED");
  });

  it("does not count today as missed before it is reported", () => {
    const s = computeMonthlyStats({
      month: sep,
      today: d("2026-09-27"),
      activities: acts(range(1, 26, "JAMAAH")),
    });
    expect(s.effectiveDays).toBe(26);
    expect(s.missed).toBe(0);
    expect(s.percentage).toBe(100);
    expect(s.days[26].state).toBe("PENDING");
    expect(s.days[27].state).toBe("FUTURE");
  });

  it("counts today once it is reported", () => {
    const s = computeMonthlyStats({
      month: sep,
      today: d("2026-09-27"),
      activities: acts({ ...range(1, 26, "JAMAAH"), "27": "SENDIRI" }),
    });
    expect(s.effectiveDays).toBe(27);
    expect(s.percentage).toBe(96); // 26/27
  });

  it("excludes days before the member joined (BR-5)", () => {
    const s = computeMonthlyStats({
      month: sep,
      today: d("2026-09-27"),
      activities: acts({ "20": "JAMAAH", "21": "JAMAAH" }),
      bounds: { notBefore: [d("2026-09-20")] },
    });
    expect(s.days[18].state).toBe("OUTSIDE"); // 19 Sep
    expect(s.missed).toBe(5); // 22–26
    expect(s.effectiveDays).toBe(7);
    expect(s.percentage).toBe(29);
  });

  it("respects the program window on both ends", () => {
    const s = computeMonthlyStats({
      month: sep,
      today: d("2026-10-05"),
      activities: [],
      bounds: { notBefore: [d("2026-09-10")], notAfter: [d("2026-09-19")] },
    });
    expect(s.effectiveDays).toBe(10);
    expect(s.missed).toBe(10);
    expect(s.days[8].state).toBe("OUTSIDE");
    expect(s.days[19].state).toBe("OUTSIDE");
  });

  it("returns zeros for a future month and a member who has not joined yet", () => {
    const future = computeMonthlyStats({
      month: { year: 2026, month: 10 },
      today: d("2026-09-27"),
      activities: [],
    });
    expect(future).toMatchObject({ effectiveDays: 0, percentage: 0, missed: 0 });
    expect(future.days.every((day) => day.state === "FUTURE")).toBe(true);

    const notJoined = computeMonthlyStats({
      month: sep,
      today: d("2026-10-05"),
      activities: [],
      bounds: { notBefore: [d("2026-10-01")] },
    });
    expect(notJoined.effectiveDays).toBe(0);
  });

  it("still counts a stored report that falls outside the window", () => {
    const s = computeMonthlyStats({
      month: sep,
      today: d("2026-09-27"),
      activities: acts({ "05": "JAMAAH" }),
      bounds: { notBefore: [d("2026-09-10")] },
    });
    expect(s.days[4].state).toBe("JAMAAH");
    expect(s.jamaah).toBe(1);
  });
});

describe("percentageOf", () => {
  it("rounds and guards division by zero", () => {
    expect(percentageOf(25, 30)).toBe(83);
    expect(percentageOf(2, 3)).toBe(67);
    expect(percentageOf(0, 0)).toBe(0);
  });
});

describe("computeJamaahStreak", () => {
  it("counts back from today when today is reported", () => {
    expect(computeJamaahStreak(acts({ ...range(20, 27, "JAMAAH") }), d("2026-09-27"))).toBe(8);
  });

  it("counts back from yesterday while today is still pending", () => {
    expect(computeJamaahStreak(acts(range(20, 26, "JAMAAH")), d("2026-09-27"))).toBe(7);
  });

  it("is broken by a SENDIRI day or a gap", () => {
    expect(
      computeJamaahStreak(acts({ ...range(20, 25, "JAMAAH"), "26": "SENDIRI" }), d("2026-09-27")),
    ).toBe(0);
    expect(
      computeJamaahStreak(
        acts({ ...range(10, 20, "JAMAAH"), ...range(22, 26, "JAMAAH") }),
        d("2026-09-27"),
      ),
    ).toBe(5);
  });

  it("is 0 when today is reported as SENDIRI", () => {
    expect(
      computeJamaahStreak(acts({ ...range(20, 26, "JAMAAH"), "27": "SENDIRI" }), d("2026-09-27")),
    ).toBe(0);
  });

  it("spans month boundaries", () => {
    const activities: ActivityLike[] = [
      { date: d("2026-08-30"), status: "JAMAAH" },
      { date: d("2026-08-31"), status: "JAMAAH" },
      { date: d("2026-09-01"), status: "JAMAAH" },
    ];
    expect(computeJamaahStreak(activities, d("2026-09-02"))).toBe(3);
  });
});

describe("weeklyBuckets", () => {
  it("splits a 30-day month into 1–7 … 29–30", () => {
    const s = computeMonthlyStats({
      month: sep,
      today: d("2026-10-01"),
      activities: acts({ ...range(1, 7, "JAMAAH"), "08": "SENDIRI" }),
    });
    const buckets = weeklyBuckets(s);
    expect(buckets.map((b) => b.label)).toEqual(["1–7", "8–14", "15–21", "22–28", "29–30"]);
    expect(buckets[0]).toMatchObject({ jamaah: 7, sendiri: 0, missed: 0 });
    expect(buckets[1]).toMatchObject({ jamaah: 0, sendiri: 1, missed: 6 });
  });

  it("handles 31- and 28-day months", () => {
    const s = computeMonthlyStats({
      month: { year: 2026, month: 10 },
      today: d("2026-11-01"),
      activities: [],
    });
    expect(weeklyBuckets(s).at(-1)?.label).toBe("29–31");
    const feb = computeMonthlyStats({
      month: { year: 2026, month: 2 },
      today: d("2026-03-01"),
      activities: [],
    });
    expect(weeklyBuckets(feb)).toHaveLength(4);
  });
});
