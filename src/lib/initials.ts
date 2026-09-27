/** "Ahmad Fauzan" → "AF"; words without letters/digits (e.g. "(test)") are skipped. */
export function initials(name: string | null, email: string): string {
  const words = (name ?? "")
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  const single = words[0] ?? email.replace(/[^\p{L}\p{N}]/gu, "");
  return single.slice(0, 2).toUpperCase();
}
