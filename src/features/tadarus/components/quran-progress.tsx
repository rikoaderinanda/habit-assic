import { BookOpen, ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import type { IndexRange, TadarusProgress } from "../lib/progress";
import { TOTAL_AYAHS, ayahAt, getSurah, juzOf } from "../lib/quran";

const number = (n: number) => n.toLocaleString("id-ID");

/** "1–5" or "1–5, 10–12". */
function formatAyahRanges(ranges: IndexRange[]): string {
  return ranges.map((r) => (r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`)).join(", ");
}

function rangeLabel(r: IndexRange): string {
  const a = ayahAt(r.from);
  const b = ayahAt(r.to);
  const name = (n: number) => getSurah(n)!.name;
  if (a.surah === b.surah) {
    return a.ayah === b.ayah
      ? `${name(a.surah)} ${a.ayah}`
      : `${name(a.surah)} ${a.ayah}–${b.ayah}`;
  }
  return `${name(a.surah)} ${a.ayah} – ${name(b.surah)} ${b.ayah}`;
}

/** Juz boundaries as mushaf positions (ticks on the large bar). */
const JUZ_TICKS = Array.from({ length: TOTAL_AYAHS }, (_, i) => i + 1)
  .filter((i) => i > 1 && juzOf(ayahAt(i)) !== juzOf(ayahAt(i - 1)))
  .map((i) => ((i - 1) / TOTAL_AYAHS) * 100);

function Status({ progress }: { progress: TadarusProgress }) {
  const { current } = progress;
  if (!current) {
    return (
      <>
        <span className="size-2 shrink-0 rounded-full bg-chart-3" aria-hidden />
        <span className="text-muted-foreground">Belum ada ayat yang dibaca</span>
      </>
    );
  }
  if (progress.covered === TOTAL_AYAHS) {
    return (
      <>
        <span className="size-2 shrink-0 rounded-full bg-chart-1" aria-hidden />
        <span className="font-medium">Semua ayat telah dibaca</span>
      </>
    );
  }
  const surah = getSurah(current.surah)!;
  const done = current.covered === surah.ayahs;
  return (
    <>
      <span className="size-2 shrink-0 rounded-full bg-chart-1" aria-hidden />
      <span className="min-w-0 truncate">
        {done ? (
          <>
            <span className="text-muted-foreground">Surah selesai: </span>
            <span className="font-semibold">{surah.name}</span>{" "}
            <span className="text-muted-foreground tabular-nums">
              ({current.covered}/{surah.ayahs})
            </span>
            <span className="text-muted-foreground">
              {" "}
              • Lanjut: {getSurah(progress.next.surah)!.name}
            </span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">Sedang membaca: </span>
            <span className="font-semibold">{surah.name}</span>
            <span className="text-muted-foreground tabular-nums">
              {" "}
              • Ayat {formatAyahRanges(current.ayahRanges)} ({current.covered}/{surah.ayahs})
            </span>
          </>
        )}
      </span>
    </>
  );
}

/**
 * The whole mushaf as one bar, Al-Fatihah on the left to An-Nas on the right.
 * Only what has actually been read is filled, at its place in the mushaf
 * (Al-'Alaq 1–5 lights up near the end), so members can read in any order.
 */
export function QuranProgress({
  progress,
  size = "sm",
  href,
  className,
}: {
  progress: TadarusProgress;
  size?: "sm" | "lg";
  /** Makes the whole card a link (e.g. to the statistics page). */
  href?: string;
  className?: string;
}) {
  const lg = size === "lg";
  const titleId = `quran-progress-${size}`;

  const body = (
    <>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
            lg ? "size-11" : "size-8",
          )}
        >
          <BookOpen className={lg ? "size-5" : "size-4"} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className={cn("font-semibold", lg ? "text-base" : "text-sm")}>
            Al-Qur&apos;an
          </h2>
          {lg && (
            <p className="text-sm text-muted-foreground">
              Progres bacaan berdasarkan ayat yang telah Anda selesaikan
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground tabular-nums">
            {number(progress.covered)}/{number(TOTAL_AYAHS)} ayat
          </span>
          <span className="w-12 text-right text-sm font-semibold tabular-nums">
            {progress.percent.toLocaleString("id-ID")}%
          </span>
        </div>
      </div>

      <div
        role="img"
        aria-label={`Sudah dibaca ${number(progress.covered)} dari ${number(TOTAL_AYAHS)} ayat (${progress.percent.toLocaleString("id-ID")}%)`}
        className={cn("relative mt-3 overflow-hidden rounded-full bg-muted", lg ? "h-3" : "h-2")}
      >
        {lg &&
          JUZ_TICKS.map((left) => (
            <span
              key={left}
              className="absolute inset-y-0 w-px bg-background/80"
              style={{ left: `${left}%` }}
              aria-hidden
            />
          ))}
        {progress.ranges.map((r) => (
          <span
            key={r.from}
            title={rangeLabel(r)}
            className="absolute inset-y-0 min-w-1.5 rounded-full bg-chart-1"
            style={{
              left: `${((r.from - 1) / TOTAL_AYAHS) * 100}%`,
              width: `${((r.to - r.from + 1) / TOTAL_AYAHS) * 100}%`,
            }}
          />
        ))}
      </div>
      {lg && (
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground" aria-hidden>
          <span>Al-Fatihah</span>
          <span>An-Nas</span>
        </div>
      )}

      <div className={cn("flex items-center gap-2", lg ? "mt-3 text-sm" : "mt-2.5 text-xs")}>
        <Status progress={progress} />
        {progress.khatam > 0 && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-chart-2/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">
            <Trophy className="size-3" aria-hidden />
            {progress.khatam}× khatam
          </span>
        )}
        {href && (
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5",
              progress.khatam === 0 && "ml-auto",
            )}
            aria-hidden
          />
        )}
      </div>
    </>
  );

  const frame = cn(
    "block rounded-2xl border bg-card shadow-xs",
    lg ? "p-5" : "px-4 py-3",
    className,
  );

  return href ? (
    <Link href={href} className={cn("group transition-colors hover:border-primary/40", frame)}>
      {body}
    </Link>
  ) : (
    <section aria-labelledby={titleId} className={frame}>
      {body}
    </section>
  );
}
