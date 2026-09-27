"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Rendered by route-level error.tsx boundaries. */
export function ErrorState({
  title = "Terjadi kesalahan",
  description = "Halaman gagal dimuat. Periksa koneksi internet Anda lalu coba lagi.",
  onRetry,
  digest,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  digest?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center"
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-5">
          <RotateCcw aria-hidden />
          Coba lagi
        </Button>
      )}
      {digest && <p className="mt-4 font-mono text-[11px] text-muted-foreground">Kode: {digest}</p>}
    </div>
  );
}
