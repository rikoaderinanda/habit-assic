"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";

/** Catches errors thrown by layouts below the root (e.g. dashboard/admin shells). */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <ErrorState onRetry={reset} digest={error.digest} />
    </main>
  );
}
