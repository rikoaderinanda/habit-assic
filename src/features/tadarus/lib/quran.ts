/**
 * Static Qur'an reference data (mushaf Hafs / Kemenag RI numbering) and pure
 * helpers for readings. No I/O — shared by the form, the server and statistics.
 */

export type Surah = { number: number; name: string; ayahs: number };

/** Surah names in Kemenag transliteration, with their ayah counts (6.236 in total). */
const SURAH_DATA: ReadonlyArray<readonly [string, number]> = [
  ["Al-Fatihah", 7],
  ["Al-Baqarah", 286],
  ["Ali 'Imran", 200],
  ["An-Nisa'", 176],
  ["Al-Ma'idah", 120],
  ["Al-An'am", 165],
  ["Al-A'raf", 206],
  ["Al-Anfal", 75],
  ["At-Taubah", 129],
  ["Yunus", 109],
  ["Hud", 123],
  ["Yusuf", 111],
  ["Ar-Ra'd", 43],
  ["Ibrahim", 52],
  ["Al-Hijr", 99],
  ["An-Nahl", 128],
  ["Al-Isra'", 111],
  ["Al-Kahf", 110],
  ["Maryam", 98],
  ["Taha", 135],
  ["Al-Anbiya'", 112],
  ["Al-Hajj", 78],
  ["Al-Mu'minun", 118],
  ["An-Nur", 64],
  ["Al-Furqan", 77],
  ["Asy-Syu'ara'", 227],
  ["An-Naml", 93],
  ["Al-Qasas", 88],
  ["Al-'Ankabut", 69],
  ["Ar-Rum", 60],
  ["Luqman", 34],
  ["As-Sajdah", 30],
  ["Al-Ahzab", 73],
  ["Saba'", 54],
  ["Fatir", 45],
  ["Yasin", 83],
  ["As-Saffat", 182],
  ["Sad", 88],
  ["Az-Zumar", 75],
  ["Gafir", 85],
  ["Fussilat", 54],
  ["Asy-Syura", 53],
  ["Az-Zukhruf", 89],
  ["Ad-Dukhan", 59],
  ["Al-Jasiyah", 37],
  ["Al-Ahqaf", 35],
  ["Muhammad", 38],
  ["Al-Fath", 29],
  ["Al-Hujurat", 18],
  ["Qaf", 45],
  ["Az-Zariyat", 60],
  ["At-Tur", 49],
  ["An-Najm", 62],
  ["Al-Qamar", 55],
  ["Ar-Rahman", 78],
  ["Al-Waqi'ah", 96],
  ["Al-Hadid", 29],
  ["Al-Mujadilah", 22],
  ["Al-Hasyr", 24],
  ["Al-Mumtahanah", 13],
  ["As-Saff", 14],
  ["Al-Jumu'ah", 11],
  ["Al-Munafiqun", 11],
  ["At-Tagabun", 18],
  ["At-Talaq", 12],
  ["At-Tahrim", 12],
  ["Al-Mulk", 30],
  ["Al-Qalam", 52],
  ["Al-Haqqah", 52],
  ["Al-Ma'arij", 44],
  ["Nuh", 28],
  ["Al-Jinn", 28],
  ["Al-Muzzammil", 20],
  ["Al-Muddassir", 56],
  ["Al-Qiyamah", 40],
  ["Al-Insan", 31],
  ["Al-Mursalat", 50],
  ["An-Naba'", 40],
  ["An-Nazi'at", 46],
  ["'Abasa", 42],
  ["At-Takwir", 29],
  ["Al-Infitar", 19],
  ["Al-Mutaffifin", 36],
  ["Al-Insyiqaq", 25],
  ["Al-Buruj", 22],
  ["At-Tariq", 17],
  ["Al-A'la", 19],
  ["Al-Gasyiyah", 26],
  ["Al-Fajr", 30],
  ["Al-Balad", 20],
  ["Asy-Syams", 15],
  ["Al-Lail", 21],
  ["Ad-Duha", 11],
  ["Asy-Syarh", 8],
  ["At-Tin", 8],
  ["Al-'Alaq", 19],
  ["Al-Qadr", 5],
  ["Al-Bayyinah", 8],
  ["Az-Zalzalah", 8],
  ["Al-'Adiyat", 11],
  ["Al-Qari'ah", 11],
  ["At-Takasur", 8],
  ["Al-'Asr", 3],
  ["Al-Humazah", 9],
  ["Al-Fil", 5],
  ["Quraisy", 4],
  ["Al-Ma'un", 7],
  ["Al-Kausar", 3],
  ["Al-Kafirun", 6],
  ["An-Nasr", 3],
  ["Al-Lahab", 5],
  ["Al-Ikhlas", 4],
  ["Al-Falaq", 5],
  ["An-Nas", 6],
];

export const SURAHS: readonly Surah[] = SURAH_DATA.map(([name, ayahs], i) => ({
  number: i + 1,
  name,
  ayahs,
}));

export const SURAH_COUNT = SURAHS.length;

/** First ayah of each juz, as [surah, ayah]. */
const JUZ_STARTS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [2, 142],
  [2, 253],
  [3, 93],
  [4, 24],
  [4, 148],
  [5, 83],
  [6, 111],
  [7, 88],
  [8, 41],
  [9, 93],
  [11, 6],
  [12, 53],
  [15, 1],
  [17, 1],
  [18, 75],
  [21, 1],
  [23, 1],
  [25, 21],
  [27, 56],
  [29, 46],
  [33, 31],
  [36, 28],
  [39, 32],
  [41, 47],
  [46, 1],
  [51, 31],
  [58, 1],
  [67, 1],
  [78, 1],
];

/** Ayahs before each surah: OFFSETS[n - 1] = ayahs in surahs 1…n−1. */
const OFFSETS: number[] = SURAHS.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SURAHS[i - 1].ayahs);
  return acc;
}, []);

export const TOTAL_AYAHS = OFFSETS[SURAH_COUNT - 1] + SURAHS[SURAH_COUNT - 1].ayahs;

export type AyahRef = { surah: number; ayah: number };

export type Reading = { surahFrom: number; ayahFrom: number; surahTo: number; ayahTo: number };

export function getSurah(number: number): Surah | undefined {
  return SURAHS[number - 1];
}

export function isValidAyah({ surah, ayah }: AyahRef): boolean {
  const s = getSurah(surah);
  return Boolean(s) && Number.isInteger(ayah) && ayah >= 1 && ayah <= s!.ayahs;
}

/** Position in the whole mushaf, 1 (Al-Fatihah 1) … 6.236 (An-Nas 6). */
export function ayahIndex({ surah, ayah }: AyahRef): number {
  return OFFSETS[surah - 1] + ayah;
}

/** Inverse of ayahIndex; wraps past An-Nas back to Al-Fatihah. */
export function ayahAt(index: number): AyahRef {
  const i = ((((index - 1) % TOTAL_AYAHS) + TOTAL_AYAHS) % TOTAL_AYAHS) + 1;
  let surah = SURAH_COUNT;
  while (OFFSETS[surah - 1] >= i) surah--;
  return { surah, ayah: i - OFFSETS[surah - 1] };
}

/** Juz (1–30) an ayah belongs to. */
export function juzOf(ref: AyahRef): number {
  const index = ayahIndex(ref);
  let juz = 1;
  for (let j = 0; j < JUZ_STARTS.length; j++) {
    const [surah, ayah] = JUZ_STARTS[j];
    if (ayahIndex({ surah, ayah }) <= index) juz = j + 1;
  }
  return juz;
}

/** Last ayah of the juz `ref` belongs to (Juz 30 ends at An-Nas 6). */
export function juzEnd(ref: AyahRef): AyahRef {
  const juz = juzOf(ref);
  if (juz === JUZ_STARTS.length) return { surah: SURAH_COUNT, ayah: SURAHS[SURAH_COUNT - 1].ayahs };
  const [surah, ayah] = JUZ_STARTS[juz];
  return ayahAt(ayahIndex({ surah, ayah }) - 1);
}

export const readingStart = (r: Reading): AyahRef => ({ surah: r.surahFrom, ayah: r.ayahFrom });
export const readingEnd = (r: Reading): AyahRef => ({ surah: r.surahTo, ayah: r.ayahTo });

/** Ayahs in a reading, both ends inclusive. 0 when the range runs backwards. */
export function readingLength(r: Reading): number {
  return Math.max(0, ayahIndex(readingEnd(r)) - ayahIndex(readingStart(r)) + 1);
}

/** Where to continue after a reading (An-Nas 6 → Al-Fatihah 1: a new khatam). */
export function nextAyah(r: Reading): AyahRef {
  return ayahAt(ayahIndex(readingEnd(r)) + 1);
}

/** "Al-Baqarah 142" */
export function formatAyah({ surah, ayah }: AyahRef): string {
  return `${getSurah(surah)?.name ?? `Surah ${surah}`} ${ayah}`;
}

/** "Al-Baqarah 1–25" within one surah, "Al-Baqarah 280 – Ali 'Imran 10" across surahs. */
export function formatReading(r: Reading): string {
  if (r.surahFrom === r.surahTo) {
    const name = getSurah(r.surahFrom)?.name ?? `Surah ${r.surahFrom}`;
    return r.ayahFrom === r.ayahTo ? `${name} ${r.ayahFrom}` : `${name} ${r.ayahFrom}–${r.ayahTo}`;
  }
  return `${formatAyah(readingStart(r))} – ${formatAyah(readingEnd(r))}`;
}

/** "Juz 2" or "Juz 2–3". */
export function formatJuzRange(r: Reading): string {
  const from = juzOf(readingStart(r));
  const to = juzOf(readingEnd(r));
  return from === to ? `Juz ${from}` : `Juz ${from}–${to}`;
}

/** Narrow a stored activity (nullable columns) to a Reading. */
export function toReading(a: {
  surahFrom?: number | null;
  ayahFrom?: number | null;
  surahTo?: number | null;
  ayahTo?: number | null;
}): Reading | null {
  if (a.surahFrom == null || a.ayahFrom == null || a.surahTo == null || a.ayahTo == null) {
    return null;
  }
  return { surahFrom: a.surahFrom, ayahFrom: a.ayahFrom, surahTo: a.surahTo, ayahTo: a.ayahTo };
}
