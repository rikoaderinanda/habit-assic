"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { callAction } from "@/lib/call-action";
import { cn } from "@/lib/utils";

import { submitActivityAction } from "../actions";
import { NOTES_MAX_LENGTH, submitActivitySchema, type SubmitActivityInput } from "../schemas";

const OPTIONS = [
  {
    value: "JAMAAH",
    label: "Berjamaah",
    description: "Shalat Subuh berjamaah di masjid/musala",
    icon: Users,
  },
  {
    value: "SENDIRI",
    label: "Sendiri",
    description: "Shalat Subuh sendiri (munfarid)",
    icon: User,
  },
] as const;

export function ReportForm({ programId }: { programId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SubmitActivityInput>({
    resolver: zodResolver(submitActivitySchema),
    defaultValues: { programId, notes: "" },
  });
  const notes = form.watch("notes") ?? "";

  const onSubmit = (values: SubmitActivityInput) =>
    startTransition(async () => {
      const result = await callAction(() => submitActivityAction(values));
      if (!result) return;

      if (result.ok) {
        toast.success("Laporan tersimpan", {
          description: "Jazakallahu khairan, semoga istiqamah.",
        });
        router.refresh();
        return;
      }

      if (result.code === "ALREADY_SUBMITTED") {
        toast.info(result.message);
        router.refresh();
        return;
      }
      if (result.code === "UNAUTHENTICATED") {
        toast.error(result.message);
        router.push("/login");
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof SubmitActivityInput, { message });
      }
      toast.error(result.message);
    });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Controller
        control={form.control}
        name="status"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid || undefined}>
            <FieldLabel className="text-base font-semibold">Bagaimana Subuh hari ini?</FieldLabel>
            <RadioGroup
              value={field.value ?? ""}
              onValueChange={field.onChange}
              aria-invalid={fieldState.invalid}
              className="grid grid-cols-2 gap-3"
              disabled={isPending}
            >
              {OPTIONS.map((option) => {
                const selected = field.value === option.value;
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 bg-card p-4 pt-5 text-center shadow-xs transition-all",
                      "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                      selected
                        ? option.value === "JAMAAH"
                          ? "border-primary bg-primary/5"
                          : "border-warning bg-warning/10"
                        : "border-border hover:border-primary/40",
                      isPending && "cursor-not-allowed opacity-70",
                    )}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
                    <span
                      className={cn(
                        "flex size-12 items-center justify-center rounded-2xl transition-colors",
                        selected
                          ? option.value === "JAMAAH"
                            ? "bg-primary text-primary-foreground"
                            : "bg-warning text-white"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className="space-y-1">
                      <span className="block text-sm font-semibold tracking-wide uppercase">
                        {option.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="notes"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid || undefined}>
            <FieldLabel htmlFor="notes">
              Catatan <span className="font-normal text-muted-foreground">(opsional)</span>
            </FieldLabel>
            <Textarea
              id="notes"
              {...field}
              value={field.value ?? ""}
              rows={3}
              maxLength={NOTES_MAX_LENGTH}
              placeholder="Contoh: berjamaah di Masjid Al-Ikhlas"
              aria-invalid={fieldState.invalid}
              disabled={isPending}
              className="resize-none rounded-xl"
            />
            <FieldDescription className="text-right tabular-nums">
              {notes.length}/{NOTES_MAX_LENGTH}
            </FieldDescription>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="h-12 w-full rounded-xl text-base"
      >
        {isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        {isPending ? "Menyimpan…" : "Kirim Laporan"}
      </Button>
    </form>
  );
}
