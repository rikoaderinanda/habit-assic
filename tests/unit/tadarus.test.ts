import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { computeMonthlyStats } from "@/features/attendance/lib/stats";
import {
  isProgramOpenOn,
  isoWeekday,
  lastScheduledDay,
  nextOpenDay,
  scheduleLabel,
} from "@/features/programs/lib/program-window";
import { createProgramSchema } from "@/features/programs/schemas";
import { computeTadarusProgress, sumAyahs } from "@/features/tadarus/lib/progress";
import {
  SURAHS,
  TOTAL_AYAHS,
  ayahAt,
  ayahIndex,
  formatJuzRange,
  formatReading,
  juzEnd,
  juzOf,
  nextAyah,
  readingLength,
} from "@/features/tadarus/lib/quran";
import { submitTadarusSchema } from "@/features/tadarus/schemas";
import { parseDateKey } from "@/lib/date";

const d = (key: string) => parseDateKey(key);
const r = (surahFrom: number, ayahFrom: number, surahTo: number, ayahTo: number) => ({
  surahFrom,
  ayahFrom,
  surahTo,
  ayahTo,
});

describe("quran data", () => {
  it("has 114 surahs and 6.236 ayahs", () => {
    expect(SURAHS).toHaveLength(114);
    expect(TOTAL_AYAHS).toBe(6236);
    expect(SURAHS[1]).toEqual({ number: 2, name: "Al-Baqarah", ayahs: 286 });
    expect(SURAHS[113]).toEqual({ number: 114, name: "An-Nas", ayahs: 6 });
  });

  it("maps ayahs to mushaf positions and back", () => {
    expect(ayahIndex({ surah: 1, ayah: 1 })).toBe(1);
    expect(ayahIndex({ surah: 2, ayah: 1 })).toBe(8);
    expect(ayahIndex({ surah: 114, ayah: 6 })).toBe(6236);
    for (const i of [1, 7, 8, 294, 3000, 6236]) expect(ayahIndex(ayahAt(i))).toBe(i);
    expect(ayahAt(6237)).toEqual({ surah: 1, ayah: 1 });
  });

  it("knows the juz boundaries", () => {
    expect(juzOf({ surah: 1, ayah: 1 })).toBe(1);
    expect(juzOf({ surah: 2, ayah: 141 })).toBe(1);
    expect(juzOf({ surah: 2, ayah: 142 })).toBe(2);
    expect(juzOf({ surah: 18, ayah: 74 })).toBe(15);
    expect(juzOf({ surah: 18, ayah: 75 })).toBe(16);
    expect(juzOf({ surah: 114, ayah: 6 })).toBe(30);
    expect(juzEnd({ surah: 1, ayah: 3 })).toEqual({ surah: 2, ayah: 141 });
    expect(juzEnd({ surah: 78, ayah: 1 })).toEqual({ surah: 114, ayah: 6 });
  });

  it("measures and formats readings", () => {
    expect(readingLength(r(2, 1, 2, 25))).toBe(25);
    expect(readingLength(r(1, 1, 2, 5))).toBe(12);
    expect(readingLength(r(2, 10, 2, 9))).toBe(0);
    expect(formatReading(r(2, 1, 2, 25))).toBe("Al-Baqarah 1–25");
    expect(formatReading(r(36, 1, 36, 1))).toBe("Yasin 1");
    expect(formatReading(r(2, 280, 3, 10))).toBe("Al-Baqarah 280 – Ali 'Imran 10");
    expect(formatJuzRange(r(2, 130, 2, 150))).toBe("Juz 1–2");
    expect(nextAyah(r(1, 1, 1, 7))).toEqual({ surah: 2, ayah: 1 });
    expect(nextAyah(r(114, 1, 114, 6))).toEqual({ surah: 1, ayah: 1 });
  });

  it("tracks khatam progress", () => {
    expect(computeTadarusProgress([])).toMatchObject({
      totalAyahs: 0,
      khatam: 0,
      position: null,
      next: { surah: 1, ayah: 1 },
      percent: 0,
    });
    const p = computeTadarusProgress([r(1, 1, 1, 7), r(2, 1, 2, 141)]);
    expect(p).toMatchObject({ totalAyahs: 148, position: { surah: 2, ayah: 141 }, percent: 2.4 });
    expect(p.next).toEqual({ surah: 2, ayah: 142 });
    expect(sumAyahs([r(2, 1, 2, 10), { surahFrom: null }])).toBe(10);
  });

  it("fills the Qur'an bar where the ayahs were read, in any order", () => {
    // Al-'Alaq 1–5 first: only that place of the mushaf is filled.
    const alaq = computeTadarusProgress([r(96, 1, 96, 5)]);
    const alaqStart = ayahIndex({ surah: 96, ayah: 1 });
    expect(alaq).toMatchObject({ covered: 5, percent: 0.1, khatam: 0 });
    expect(alaq.ranges).toEqual([{ from: alaqStart, to: alaqStart + 4 }]);
    expect(alaq.current).toEqual({ surah: 96, covered: 5, ayahRanges: [{ from: 1, to: 5 }] });

    // Re-reading doesn't count twice; gaps stay visible per surah.
    const gaps = computeTadarusProgress([r(96, 1, 96, 5), r(96, 3, 96, 8), r(96, 12, 96, 12)]);
    expect(gaps.covered).toBe(9);
    expect(gaps.totalAyahs).toBe(12);
    expect(gaps.current?.ayahRanges).toEqual([
      { from: 1, to: 8 },
      { from: 12, to: 12 },
    ]);

    // Readings merge into one run across a surah boundary.
    expect(computeTadarusProgress([r(1, 1, 1, 7), r(2, 1, 2, 5)]).ranges).toEqual([
      { from: 1, to: 12 },
    ]);
  });

  it("completes a khatam only when every ayah has been read", () => {
    const juz30 = computeTadarusProgress([r(78, 1, 114, 6)]);
    expect(juz30).toMatchObject({ khatam: 0, next: { surah: 1, ayah: 1 } });

    const all = computeTadarusProgress([r(78, 1, 114, 6), r(1, 1, 77, 50)]);
    expect(all).toMatchObject({ khatam: 1, covered: TOTAL_AYAHS, percent: 100 });

    // The next reading starts a new khatam.
    const again = computeTadarusProgress([r(78, 1, 114, 6), r(1, 1, 77, 50), r(1, 1, 1, 7)]);
    expect(again).toMatchObject({ khatam: 1, covered: 7, ranges: [{ from: 1, to: 7 }] });
  });
});

describe("weekly schedule", () => {
  const monday = { active: true, startDate: null, endDate: null, scheduleDays: [1] };

  it("uses ISO weekdays (1 = Senin, 7 = Ahad)", () => {
    expect(isoWeekday(d("2026-09-28"))).toBe(1);
    expect(isoWeekday(d("2026-09-27"))).toBe(7);
  });

  it("opens only on scheduled days; empty = every day", () => {
    expect(isProgramOpenOn(monday, d("2026-09-28"))).toBe(true);
    expect(isProgramOpenOn(monday, d("2026-09-29"))).toBe(false);
    expect(isProgramOpenOn({ ...monday, scheduleDays: [] }, d("2026-09-29"))).toBe(true);
    expect(isProgramOpenOn({ ...monday, active: false }, d("2026-09-28"))).toBe(false);
  });

  it("finds the next and the last session", () => {
    expect(nextOpenDay(monday, d("2026-09-29"))).toEqual(d("2026-10-05"));
    expect(nextOpenDay(monday, d("2026-09-28"))).toEqual(d("2026-09-28"));
    expect(nextOpenDay({ ...monday, endDate: d("2026-10-01") }, d("2026-09-29"))).toBeNull();
    expect(lastScheduledDay(monday, d("2026-09-27"))).toEqual(d("2026-09-21"));
    expect(lastScheduledDay({ ...monday, startDate: d("2026-09-25") }, d("2026-09-27"))).toBeNull();
  });

  it("labels schedules in Indonesian", () => {
    expect(scheduleLabel([])).toBe("Setiap hari");
    expect(scheduleLabel([1, 2, 3, 4, 5, 6, 7])).toBe("Setiap hari");
    expect(scheduleLabel([1])).toBe("Setiap Senin");
    expect(scheduleLabel([4, 1])).toBe("Senin & Kamis");
    expect(scheduleLabel([1, 3, 5])).toBe("Sen, Rab, Jum");
  });

  it("counts only scheduled days in monthly stats", () => {
    const s = computeMonthlyStats({
      month: { year: 2026, month: 9 },
      today: d("2026-09-28"),
      activities: [{ date: d("2026-09-14"), status: "HADIR" }],
      bounds: { scheduleDays: [1] },
    });
    // Mondays: 7 (missed), 14 (hadir), 21 (missed), 28 (today, pending).
    expect(s).toMatchObject({ effectiveDays: 3, hadir: 1, missed: 2, percentage: 33 });
    expect(s.days[27].state).toBe("PENDING");
    expect(s.days[15].state).toBe("OFF");
    expect(s.days[28].state).toBe("OFF"); // Tue 29, future but unscheduled
  });
});

describe("tadarus form schema", () => {
  const programId = randomUUID();

  it("accepts a forward reading", () => {
    expect(submitTadarusSchema.safeParse({ programId, ...r(2, 1, 2, 25) }).success).toBe(true);
    expect(submitTadarusSchema.safeParse({ programId, ...r(2, 280, 3, 10) }).success).toBe(true);
  });

  it("rejects ayahs beyond the surah and backwards ranges", () => {
    const tooFar = submitTadarusSchema.safeParse({ programId, ...r(1, 1, 1, 8) });
    expect(tooFar.error?.issues[0]).toMatchObject({
      path: ["ayahTo"],
      message: "Al-Fatihah hanya 7 ayat",
    });
    const backwards = submitTadarusSchema.safeParse({ programId, ...r(3, 1, 2, 10) });
    expect(backwards.error?.issues[0].message).toBe("Akhir bacaan tidak boleh sebelum awal bacaan");
    expect(submitTadarusSchema.safeParse({ programId, ...r(115, 1, 115, 1) }).success).toBe(false);
    expect(submitTadarusSchema.safeParse({ programId, ...r(2, Number.NaN, 2, 5) }).success).toBe(
      false,
    );
  });

  it("normalises the program schedule", () => {
    const parsed = createProgramSchema.parse({
      name: "Tadarus",
      slug: "tadarus",
      kind: "TADARUS",
      description: "",
      startDate: "",
      endDate: "",
      scheduleDays: [4, 1, 1],
    });
    expect(parsed.scheduleDays).toEqual([1, 4]);
    expect(createProgramSchema.safeParse({ ...parsed, scheduleDays: [0] }).success).toBe(false);
  });
});
