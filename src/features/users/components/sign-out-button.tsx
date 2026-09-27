"use client";

import { Loader2, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";

function SubmitButton({ label, className }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending} className={className}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
      {label}
    </Button>
  );
}

export function SignOutButton({
  label = "Keluar",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <form action={signOutAction}>
      <SubmitButton label={label} className={className} />
    </form>
  );
}
