"use client";

import { Loader2, ShieldCheck, ShieldOff, UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { callAction } from "@/lib/call-action";

import { setMemberActiveAction, setMemberRoleAction } from "../actions";

type Props = {
  userId: string;
  name: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  isSelf: boolean;
};

function ConfirmButton({
  label,
  icon: Icon,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
}: {
  label: string;
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button
          variant={destructive ? "outline" : "secondary"}
          className={destructive ? "text-destructive" : undefined}
        >
          <Icon aria-hidden />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await callAction(onConfirm);
                if (!result) return;
                if (result.ok) {
                  toast.success(result.message);
                  setOpen(false);
                  router.refresh();
                } else {
                  toast.error(result.message);
                }
              });
            }}
          >
            {isPending && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Role / active-status management on the member detail page. */
export function MemberControls({ userId, name, role, isActive, isSelf }: Props) {
  if (isSelf) {
    return (
      <p className="text-xs text-muted-foreground">
        Ini akun Anda — role dan status tidak dapat diubah sendiri.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {role === "ADMIN" ? (
        <ConfirmButton
          label="Cabut admin"
          icon={ShieldOff}
          title="Cabut akses admin?"
          description={`${name} tidak akan bisa membuka dashboard admin lagi. Perubahan berlaku seketika.`}
          confirmLabel="Cabut admin"
          destructive
          onConfirm={() => setMemberRoleAction({ userId, role: "USER" })}
        />
      ) : (
        <ConfirmButton
          label="Jadikan admin"
          icon={ShieldCheck}
          title="Jadikan admin?"
          description={`${name} akan bisa melihat data seluruh anggota, mengelola program, dan mengubah role anggota lain.`}
          confirmLabel="Jadikan admin"
          onConfirm={() => setMemberRoleAction({ userId, role: "ADMIN" })}
        />
      )}
      {isActive ? (
        <ConfirmButton
          label="Nonaktifkan"
          icon={UserX}
          title="Nonaktifkan anggota?"
          description={`${name} tidak bisa login dan tidak dihitung di monitoring. Riwayat laporannya tetap tersimpan dan bisa diaktifkan kembali.`}
          confirmLabel="Nonaktifkan"
          destructive
          onConfirm={() => setMemberActiveAction({ userId, isActive: false })}
        />
      ) : (
        <ConfirmButton
          label="Aktifkan kembali"
          icon={UserCheck}
          title="Aktifkan kembali?"
          description={`${name} bisa login lagi dan kembali dihitung di monitoring.`}
          confirmLabel="Aktifkan"
          onConfirm={() => setMemberActiveAction({ userId, isActive: true })}
        />
      )}
    </div>
  );
}
