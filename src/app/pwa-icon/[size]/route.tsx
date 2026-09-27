import { brandIconResponse } from "@/lib/brand-icon";

const SIZES = new Set([192, 512]);

export const dynamic = "force-static";

export function generateStaticParams() {
  return [...SIZES].flatMap((s) => [{ size: String(s) }, { size: `${s}-maskable` }]);
}

/** /pwa-icon/192, /pwa-icon/512, /pwa-icon/512-maskable — referenced by manifest.ts. */
export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const maskable = raw.endsWith("-maskable");
  const size = Number.parseInt(raw, 10);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  return brandIconResponse(size, { maskable });
}
