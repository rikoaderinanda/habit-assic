"use client";

import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

/** Search box that writes ?q= to the URL (debounced) and resets to page 1. */
export function MemberSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  const apply = useDebouncedCallback((q: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    params.delete("page");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }, 350);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          apply(e.target.value);
        }}
        placeholder="Cari nama atau email…"
        aria-label="Cari anggota"
        maxLength={100}
        className="h-10 rounded-xl pr-9 pl-9"
      />
      {isPending ? (
        <Loader2
          className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : (
        value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              apply("");
            }}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Hapus pencarian"
          >
            <X className="size-4" aria-hidden />
          </button>
        )
      )}
    </div>
  );
}
