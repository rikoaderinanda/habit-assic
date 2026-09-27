import { cn } from "@/lib/utils";

/** Decorative eight-pointed-star (Rub el Hizb) tile pattern. Purely visual. */
export function IslamicPattern({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={cn("pointer-events-none", className)} width="100%" height="100%">
      <defs>
        <pattern id="rub-el-hizb" width="56" height="56" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="16" y="16" width="24" height="24" />
            <rect x="16" y="16" width="24" height="24" transform="rotate(45 28 28)" />
            <circle cx="28" cy="28" r="4" />
            <path d="M0 28h8M48 28h8M28 0v8M28 48v8" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#rub-el-hizb)" />
    </svg>
  );
}
