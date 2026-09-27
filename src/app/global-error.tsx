"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it cannot rely on globals.css — styles are inline.
 */
export default function GlobalError({
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
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#1b2b25",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Aplikasi mengalami gangguan</h1>
          <p style={{ color: "#5f6f69", margin: "0 0 20px" }}>
            Silakan muat ulang halaman. Jika masih terjadi, hubungi pengurus asrama.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#2f8a60",
              color: "#fff",
              border: 0,
              borderRadius: 12,
              padding: "12px 20px",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
          {error.digest && (
            <p style={{ marginTop: 16, fontSize: 11, color: "#8a9994", fontFamily: "monospace" }}>
              Kode: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
