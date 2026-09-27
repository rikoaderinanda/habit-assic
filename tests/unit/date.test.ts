import { describe, expect, it } from "vitest";

import {
  daysInMonth,
  eachDayOfMonth,
  effectiveDays,
  formatDate,
  formatMonth,
  monthRange,
  parseDateKey,
  parseMonthKey,
  toDateKey,
  todayInTz,
  toMonthKey,
} from "@/lib/date";

const WIB = "Asia/Jakarta";
const d = (key: string) => parseDateKey(key);

describe("todayInTz", () => {
  it("uses the WIB calendar day, not the UTC one, just after midnight WIB", () => {
    // 2026-09-04T17:30Z = 2026-09-05 00:30 WIB
    expect(toDateKey(todayInTz(new Date("2026-09-04T17:30:00Z"), WIB))).toBe("2026-09-05");
  });

  it("keeps the member's day for a Subuh-time report (04:30 WIB = 21:30 UTC the day before)", () => {
    expect(toDateKey(todayInTz(new Date("2026-09-04T21:30:00Z"), WIB))).toBe("2026-09-05");
  });

  it("switches day exactly at 00:00 WIB", () => {
    // 2026-09-05T16:59Z = 23:59 WIB, 17:00Z = 00:00 WIB next day
    expect(toDateKey(todayInTz(new Date("2026-09-05T16:59:00Z"), WIB))).toBe("2026-09-05");
    expect(toDateKey(todayInTz(new Date("2026-09-05T17:00:00Z"), WIB))).toBe("2026-09-06");
  });

  it("returns a UTC-midnight value (Prisma @db.Date shape)", () => {
    expect(todayInTz(new Date("2026-09-04T21:30:00Z"), WIB).toISOString()).toBe(
      "2026-09-05T00:00:00.000Z",
    );
  });
});

describe("parseDateKey / parseMonthKey", () => {
  it("rejects impossible or malformed dates", () => {
    expect(() => parseDateKey("2026-02-30")).toThrow(RangeError);
    expect(() => parseDateKey("2026-9-5")).toThrow(RangeError);
  });

  it("parses valid month keys and rejects invalid ones", () => {
    expect(parseMonthKey("2026-09")).toEqual({ year: 2026, month: 9 });
    expect(parseMonthKey("2026-13")).toBeNull();
    expect(parseMonthKey("abc")).toBeNull();
    expect(parseMonthKey(undefined)).toBeNull();
    expect(toMonthKey({ year: 2026, month: 3 })).toBe("2026-03");
  });
});

describe("month helpers", () => {
  it("handles month lengths including leap February", () => {
    expect(daysInMonth({ year: 2026, month: 9 })).toBe(30);
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29);
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
    expect(eachDayOfMonth({ year: 2026, month: 12 })).toHaveLength(31);
  });

  it("returns an exclusive end bound for range queries, across year end", () => {
    const r = monthRange({ year: 2026, month: 12 });
    expect(toDateKey(r.start)).toBe("2026-12-01");
    expect(toDateKey(r.lastDay)).toBe("2026-12-31");
    expect(toDateKey(r.end)).toBe("2027-01-01");
  });
});

describe("effectiveDays (BR-5)", () => {
  const sep = { year: 2026, month: 9 };

  it("counts the full month once it is over", () => {
    expect(effectiveDays(sep, d("2026-10-10"))).toBe(30);
  });

  it("counts only days up to and including today in the current month", () => {
    expect(effectiveDays(sep, d("2026-09-27"))).toBe(27);
    expect(effectiveDays(sep, d("2026-09-01"))).toBe(1);
  });

  it("does not count days before the member joined", () => {
    expect(effectiveDays(sep, d("2026-09-27"), [d("2026-09-20")])).toBe(8);
  });

  it("uses the latest of several floors (join date, program start)", () => {
    expect(effectiveDays(sep, d("2026-09-30"), [d("2026-09-10"), d("2026-09-15"), null])).toBe(16);
  });

  it("ignores floors before the month", () => {
    expect(effectiveDays(sep, d("2026-09-30"), [d("2025-01-01")])).toBe(30);
  });

  it("is 0 for future months and for members who joined after the window", () => {
    expect(effectiveDays({ year: 2026, month: 10 }, d("2026-09-27"))).toBe(0);
    expect(effectiveDays(sep, d("2026-10-05"), [d("2026-10-01")])).toBe(0);
  });
});

describe("formatting (id-ID)", () => {
  it("formats in Indonesian without shifting the day", () => {
    expect(formatDate(d("2026-09-01"))).toBe("1 September 2026");
    expect(formatMonth({ year: 2026, month: 8 })).toBe("Agustus 2026");
  });
});
