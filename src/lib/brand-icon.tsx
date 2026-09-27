import { ImageResponse } from "next/og";

/** PNG app icon (apple-touch-icon, PWA manifest) rendered from the brand mark. */
export function brandIconResponse(size: number, { maskable = false } = {}) {
  // Maskable icons need the mark inside the central 80% "safe zone".
  const inner = Math.round(size * (maskable ? 0.5 : 0.62));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2f8a60",
        borderRadius: maskable ? 0 : Math.round(size * 0.22),
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 64 64">
        <g fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M36 14.5a17 17 0 1 0 12.5 25A13.5 13.5 0 0 1 36 14.5Z" />
          <path d="M47 9v8M43 13h8" />
        </g>
      </svg>
    </div>,
    { width: size, height: size },
  );
}
