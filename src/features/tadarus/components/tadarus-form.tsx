"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, BookOpen, Loader2, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NOTES_MAX_LENGTH } from "@/features/attendance/schemas";
import { callAction } from "@/lib/call-action";
import { cn } from "@/lib/utils";

import { submitTadarusAction } from "../actions";
import {
  SURAHS,
  TOTAL_AYAHS,
  ayahAt,
  ayahIndex,
  formatJuzRange,
  getSurah,
  isValidAyah,
  juzEnd,
  readingLength,
  type AyahRef,
} from "../lib/quran";
import { submitTadarusSchema, type SubmitTadarusInput } from "../schemas";

type Props = {
  programId: string;
  /** Where the member left off (the ayah after their last reading), or Al-Fatihah 1. */
  start: AyahRef;
  /** "Senin, 21 September 2026 · Al-Baqarah 100–141" when there is a previous reading. */
  continuedFrom?: string;
};

function SurahSelect({
  id,
  value,
  onChange,
  invalid,
  disabled,
}: {
  id: string;
  value: number | undefined;
  onChange: (surah: number) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value ? String(value) : ""}
      onValueChange={(v) => onChange(Number(v))}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalid}
        className="h-11 w-full min-w-0 rounded-xl bg-background text-left"
      >
        {/* Only the name in the trigger: the item's number and ayah count don't fit on phones. */}
        <SelectValue placeholder="Pilih surah">
          {value ? getSurah(value)?.name : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {SURAHS.map((s) => (
          <SelectItem key={s.number} value={String(s.number)} textValue={s.name}>
            <span className="w-7 text-xs text-muted-foreground tabular-nums">{s.number}.</span>
            <span className="truncate">{s.name}</span>
            <span className="ml-auto pl-3 text-xs text-muted-foreground tabular-nums">
              {s.ayahs} ayat
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TadarusForm({ programId, start, continuedFrom }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SubmitTadarusInput>({
    resolver: zodResolver(submitTadarusSchema),
    defaultValues: {
      programId,
      surahFrom: start.surah,
      ayahFrom: start.ayah,
      surahTo: start.surah,
      notes: "",
    },
  });
  const [surahFrom, ayahFrom, surahTo, ayahTo, notes = ""] = form.watch([
    "surahFrom",
    "ayahFrom",
    "surahTo",
    "ayahTo",
    "notes",
  ]);

  const from = { surah: surahFrom, ayah: ayahFrom };
  const to = { surah: surahTo, ayah: ayahTo };
  const fromValid = isValidAyah(from);
  const toValid = isValidAyah(to);
  const reading = fromValid && toValid ? { surahFrom, ayahFrom, surahTo, ayahTo } : null;
  const total = reading ? readingLength(reading) : 0;

  const setTo = (ref: AyahRef) => {
    form.setValue("surahTo", ref.surah, { shouldValidate: true });
    form.setValue("ayahTo", ref.ayah, { shouldValidate: true });
  };
  const quickPicks: Array<{ label: string; target: AyahRef }> = fromValid
    ? [
        { label: "+10 ayat", target: ayahAt(Math.min(ayahIndex(from) + 9, TOTAL_AYAHS)) },
        {
          label: "Akhir surah",
          target: { surah: surahFrom, ayah: getSurah(surahFrom)!.ayahs },
        },
        { label: "Akhir juz", target: juzEnd(from) },
      ]
    : [];

  const onSubmit = (values: SubmitTadarusInput) =>
    startTransition(async () => {
      const result = await callAction(() => submitTadarusAction(values));
      if (!result) return;

      if (result.ok) {
        toast.success("Bacaan tersimpan", {
          description: "Barakallahu fiik, semoga menjadi syafaat di akhirat.",
        });
        router.refresh();
        return;
      }
      if (result.code === "ALREADY_SUBMITTED" || result.code === "PROGRAM_CLOSED") {
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
        form.setError(field as FieldPath<SubmitTadarusInput>, { message });
      }
      toast.error(result.message);
    });

  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
      {continuedFrom && (
        <div className="flex items-start gap-3 rounded-xl bg-primary/5 px-4 py-3 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p className="text-pretty">
            <span className="font-medium">Melanjutkan bacaan terakhir.</span>{" "}
            <span className="text-muted-foreground">{continuedFrom}</span>
          </p>
        </div>
      )}

      <fieldset className="space-y-3 rounded-2xl border bg-muted/30 p-4" disabled={isPending}>
        <legend className="sr-only">Awal bacaan</legend>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            1
          </span>
          Mulai dari
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
          <Controller
            control={form.control}
            name="surahFrom"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="surah-from" className="text-xs text-muted-foreground">
                  Surah
                </FieldLabel>
                <SurahSelect
                  id="surah-from"
                  value={field.value}
                  invalid={fieldState.invalid}
                  disabled={isPending}
                  onChange={(surah) => {
                    field.onChange(surah);
                    form.setValue("ayahFrom", 1, { shouldValidate: true });
                    // Keep the end at or after the start.
                    if (!surahTo || surahTo < surah) form.setValue("surahTo", surah);
                  }}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Field data-invalid={Boolean(errors.ayahFrom) || undefined}>
            <FieldLabel htmlFor="ayah-from" className="text-xs text-muted-foreground">
              Ayat
            </FieldLabel>
            <Input
              id="ayah-from"
              type="number"
              inputMode="numeric"
              min={1}
              max={getSurah(surahFrom)?.ayahs}
              aria-invalid={Boolean(errors.ayahFrom)}
              className="h-11 rounded-xl bg-background text-center text-base tabular-nums"
              {...form.register("ayahFrom", { valueAsNumber: true })}
            />
          </Field>
        </div>
        <FieldError errors={[errors.ayahFrom]} />
      </fieldset>

      <div className="-my-2 flex justify-center" aria-hidden>
        <span className="flex size-8 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs">
          <ArrowDown className="size-4" />
        </span>
      </div>

      <fieldset className="space-y-3 rounded-2xl border bg-muted/30 p-4" disabled={isPending}>
        <legend className="sr-only">Akhir bacaan</legend>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            2
          </span>
          Sampai
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
          <Controller
            control={form.control}
            name="surahTo"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="surah-to" className="text-xs text-muted-foreground">
                  Surah
                </FieldLabel>
                <SurahSelect
                  id="surah-to"
                  value={field.value}
                  invalid={fieldState.invalid}
                  disabled={isPending}
                  onChange={field.onChange}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Field data-invalid={Boolean(errors.ayahTo) || undefined}>
            <FieldLabel htmlFor="ayah-to" className="text-xs text-muted-foreground">
              Ayat
            </FieldLabel>
            <Input
              id="ayah-to"
              type="number"
              inputMode="numeric"
              min={1}
              max={getSurah(surahTo)?.ayahs}
              placeholder="…"
              aria-invalid={Boolean(errors.ayahTo)}
              className="h-11 rounded-xl bg-background text-center text-base tabular-nums"
              {...form.register("ayahTo", { valueAsNumber: true })}
            />
          </Field>
        </div>
        <FieldError errors={[errors.ayahTo]} />

        {quickPicks.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Isi cepat akhir bacaan">
            {quickPicks.map(({ label, target }) => (
              <button
                key={label}
                type="button"
                onClick={() => setTo(target)}
                className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <div
        aria-live="polite"
        className={cn(
          "flex items-center gap-4 rounded-2xl px-4 py-4 transition-colors",
          total > 0
            ? "bg-gradient-to-br from-primary to-chart-5 text-primary-foreground shadow-sm shadow-primary/20"
            : "bg-muted text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl",
            total > 0 ? "bg-white/20" : "bg-background",
          )}
        >
          <BookOpen className="size-5" aria-hidden />
        </span>
        {reading && total > 0 ? (
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums">
              {total.toLocaleString("id-ID")} ayat
            </p>
            <p className="text-xs text-primary-foreground/80">{formatJuzRange(reading)}</p>
          </div>
        ) : (
          <p className="text-sm">Isi awal dan akhir bacaan untuk melihat jumlah ayat.</p>
        )}
      </div>

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
              rows={2}
              maxLength={NOTES_MAX_LENGTH}
              placeholder="Contoh: tadarus bersama di musala asrama"
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
        {isPending ? "Menyimpan…" : "Simpan Bacaan"}
      </Button>
    </form>
  );
}
