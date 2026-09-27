"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { callAction } from "@/lib/call-action";

import { setProgramActiveAction } from "../actions";

export function ProgramActiveSwitch({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(active);

  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch
        checked={optimistic}
        disabled={isPending}
        aria-label={`${optimistic ? "Nonaktifkan" : "Aktifkan"} ${name}`}
        onCheckedChange={(next) => {
          if (
            !next &&
            !window.confirm(
              `Nonaktifkan "${name}"? Anggota tidak bisa melapor, riwayat tetap tersimpan.`,
            )
          ) {
            return;
          }
          startTransition(async () => {
            setOptimistic(next);
            const result = await callAction(() => setProgramActiveAction({ id, active: next }));
            if (!result) {
              router.refresh();
              return;
            }
            if (result.ok) toast.success(result.message);
            else toast.error(result.message);
            router.refresh();
          });
        }}
      />
      <span className={optimistic ? "font-medium text-primary" : "text-muted-foreground"}>
        {optimistic ? "Aktif" : "Nonaktif"}
      </span>
    </label>
  );
}
