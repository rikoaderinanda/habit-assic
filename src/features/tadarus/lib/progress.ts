import {
  SURAHS,
  TOTAL_AYAHS,
  ayahAt,
  ayahIndex,
  nextAyah,
  readingEnd,
  readingLength,
  readingStart,
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

/** Inclusive range of mushaf positions (see ayahIndex), 1 … 6.236. */
export type IndexRange = { from: number; to: number };

export type TadarusProgress = {
  /** Ayahs read across all reports (re-reading counts again). */
  totalAyahs: number;
  /** Times every ayah of the mushaf has been read. */
  khatam: number;
  /** Distinct ayahs read in the current khatam. */
  covered: number;
  /** covered ÷ 6.236, 0–100 (one decimal). */
  percent: number;
  /** Read parts of the current khatam, in mushaf order (for the Qur'an bar). */
  ranges: IndexRange[];
  /** Surah of the latest reading, with what has been read of it in the current khatam. */
  current: { surah: number; covered: number; ayahRanges: IndexRange[] } | null;
  /** End of the latest reading, or null before the first report. */
  position: AyahRef | null;
  /** Where the next reading continues from. */
  next: AyahRef;
};

/** Contiguous runs of set flags in `covered[from..to]`. */
function runs(covered: Uint8Array, from: number, to: number, offset = 0): IndexRange[] {
  const out: IndexRange[] = [];
  for (let i = from; i <= to; i++) {
    if (!covered[i]) continue;
    const start = i;
    while (i + 1 <= to && covered[i + 1]) i++;
    out.push({ from: start - offset, to: i - offset });
  }
  return out;
}

/**
 * Lifetime progress from a member's readings, oldest first. A khatam is every
 * ayah read at least once, in any order; the reading after a khatam starts the
 * next one (until then the bar stays full).
 */
export function computeTadarusProgress(readings: Reading[]): TadarusProgress {
  let covered = new Uint8Array(TOTAL_AYAHS + 1);
  let count = 0;
  let khatam = 0;

  for (const r of readings) {
    if (count === TOTAL_AYAHS) {
      covered = new Uint8Array(TOTAL_AYAHS + 1);
      count = 0;
    }
    const from = ayahIndex(readingStart(r));
    const to = ayahIndex(readingEnd(r));
    for (let i = from; i <= to; i++) {
      if (!covered[i]) {
        covered[i] = 1;
        count++;
      }
    }
    if (count === TOTAL_AYAHS) khatam++;
  }

  const last = readings.at(-1);
  let current: TadarusProgress["current"] = null;
  if (last) {
    const surah = SURAHS[last.surahTo - 1];
    const first = ayahIndex({ surah: surah.number, ayah: 1 });
    const ayahRanges = runs(covered, first, first + surah.ayahs - 1, first - 1);
    current = {
      surah: surah.number,
      covered: ayahRanges.reduce((sum, x) => sum + x.to - x.from + 1, 0),
      ayahRanges,
    };
  }

  return {
    totalAyahs: readings.reduce((sum, r) => sum + readingLength(r), 0),
    khatam,
    covered: count,
    percent: Math.round((count / TOTAL_AYAHS) * 1000) / 10,
    ranges: runs(covered, 1, TOTAL_AYAHS),
    current,
    position: last ? readingEnd(last) : null,
    next: last ? nextAyah(last) : ayahAt(1),
  };
}
