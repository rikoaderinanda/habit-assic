import {
  TOTAL_AYAHS,
  ayahIndex,
  khatamProgress,
  nextAyah,
  readingEnd,
  readingLength,
  toReading,
  type AyahRef,
  type Reading,
} from "./quran";

type ReadingColumns = Parameters<typeof toReading>[0];

/** Total ayahs across stored reports (reports without a reading count 0). */
export function sumAyahs(items: ReadingColumns[]): number {
  return items.reduce((sum, item) => {
    const reading = toReading(item);
    return sum + (reading ? readingLength(reading) : 0);
  }, 0);
}

export type TadarusProgress = {
  /** Ayahs read across all reports. */
  totalAyahs: number;
  /** Readings that reached the end of the mushaf (An-Nas 6). */
  khatam: number;
  /** End of the latest reading, or null before the first report. */
  position: AyahRef | null;
  /** Where the next reading continues from. */
  next: AyahRef;
  /** Share of the current khatam completed, 0–100 (0 again right after a khatam). */
  percent: number;
};

/** Lifetime progress from a member's readings, oldest first. */
export function computeTadarusProgress(readings: Reading[]): TadarusProgress {
  const last = readings.at(-1);
  const finished = last ? ayahIndex(readingEnd(last)) === TOTAL_AYAHS : false;
  return {
    totalAyahs: readings.reduce((sum, r) => sum + readingLength(r), 0),
    khatam: readings.filter((r) => ayahIndex(readingEnd(r)) === TOTAL_AYAHS).length,
    position: last ? readingEnd(last) : null,
    next: last ? nextAyah(last) : { surah: 1, ayah: 1 },
    percent: last && !finished ? khatamProgress(readingEnd(last)) : 0,
  };
}
