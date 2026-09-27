import { Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";
import { IslamicPattern } from "@/components/shared/islamic-pattern";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <IslamicPattern className="absolute inset-0 text-primary/5" />
      <div className="relative flex flex-col items-center">
        <BrandMark className="mb-10" />
        <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="size-8" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan.
        </p>
        <Button asChild className="mt-6 h-11 rounded-xl px-6">
          <Link href="/dashboard">Kembali ke Beranda</Link>
        </Button>
      </div>
    </main>
  );
}
