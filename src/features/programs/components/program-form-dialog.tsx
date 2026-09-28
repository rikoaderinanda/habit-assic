"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ProgramKind } from "@prisma/client";
import { BookOpen, Loader2, Pencil, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { callAction } from "@/lib/call-action";
import { cn } from "@/lib/utils";

import { createProgramAction, updateProgramAction } from "../actions";
import { WEEKDAYS, scheduleLabel } from "../lib/program-window";
import { createProgramSchema, slugify, type CreateProgramInput } from "../schemas";

const KINDS: Array<{
  value: ProgramKind;
  label: string;
  description: string;
  icon: typeof Users;
}> = [
  {
    value: "SHALAT",
    label: "Shalat berjamaah",
    description: "Anggota memilih Berjamaah atau Sendiri",
    icon: Users,
  },
  {
    value: "TADARUS",
    label: "Tadarus Qur'an",
    description: "Anggota mengisi surah & ayat yang dibaca",
    icon: BookOpen,
  },
];

type Initial = {
  id: string;
  slug: string;
  name: string;
  kind: ProgramKind;
  scheduleDays: number[];
  description: string | null;
  startDate: string;
  endDate: string;
};

type FormValues = CreateProgramInput;

/** Create a program (no `initial`) or edit one. Slug is fixed after creation. */
export function ProgramFormDialog({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [open, setOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [isPending, startTransition] = useTransition();

  const defaults: FormValues = {
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    kind: initial?.kind ?? "SHALAT",
    scheduleDays: initial?.scheduleDays ?? [],
    description: initial?.description ?? "",
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
  };
  const form = useForm<FormValues>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: defaults,
  });
  const { errors } = form.formState;

  const onSubmit = (values: FormValues) =>
    startTransition(async () => {
      const result = await callAction(() =>
        initial ? updateProgramAction({ ...values, id: initial.id }) : createProgramAction(values),
      );
      if (!result) return;

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        form.reset(isEdit ? values : defaults);
        setSlugTouched(isEdit);
        router.refresh();
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof FormValues, { message });
      }
      toast.error(result.message);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        setOpen(next);
        if (!next) form.reset(defaults);
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">
            <Pencil aria-hidden />
            Ubah
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden />
            Program baru
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah program" : "Program baru"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perubahan langsung terlihat oleh semua anggota."
              : "Program baru langsung aktif dan muncul di beranda anggota."}
          </DialogDescription>
        </DialogHeader>

        <form id="program-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.name) || undefined}>
              <FieldLabel htmlFor="program-name">Nama program</FieldLabel>
              <Input
                id="program-name"
                placeholder="Contoh: Tahajud"
                aria-invalid={Boolean(errors.name)}
                disabled={isPending}
                {...form.register("name", {
                  onChange: (e) => {
                    if (!slugTouched)
                      form.setValue("slug", slugify(e.target.value), { shouldValidate: false });
                  },
                })}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={Boolean(errors.slug) || undefined}>
              <FieldLabel htmlFor="program-slug">Slug (alamat URL)</FieldLabel>
              <Input
                id="program-slug"
                placeholder="tahajud"
                aria-invalid={Boolean(errors.slug)}
                disabled={isPending || isEdit}
                className="font-mono text-sm"
                {...form.register("slug", { onChange: () => setSlugTouched(true) })}
              />
              <FieldDescription>
                {isEdit
                  ? "Slug tidak dapat diubah setelah program dibuat."
                  : "/dashboard/report/" + (form.watch("slug") || "…")}
              </FieldDescription>
              <FieldError errors={[errors.slug]} />
            </Field>

            <Controller
              control={form.control}
              name="kind"
              render={({ field }) => (
                <Field>
                  <FieldLabel id="program-kind-label">Jenis program</FieldLabel>
                  <div
                    role="radiogroup"
                    aria-labelledby="program-kind-label"
                    className="grid grid-cols-2 gap-2"
                  >
                    {KINDS.map((kind) => {
                      const selected = field.value === kind.value;
                      const Icon = kind.icon;
                      return (
                        <button
                          key={kind.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={isPending || (isEdit && !selected)}
                          onClick={() => {
                            field.onChange(kind.value);
                            // Tadarus is usually weekly: start from Monday.
                            if (
                              kind.value === "TADARUS" &&
                              form.getValues("scheduleDays").length === 0
                            )
                              form.setValue("scheduleDays", [1]);
                          }}
                          className={cn(
                            "flex flex-col items-start gap-1.5 rounded-xl border-2 p-3 text-left transition-colors disabled:cursor-not-allowed",
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40 disabled:opacity-50",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-5",
                              selected ? "text-primary" : "text-muted-foreground",
                            )}
                            aria-hidden
                          />
                          <span className="text-sm font-semibold">{kind.label}</span>
                          <span className="text-xs text-muted-foreground">{kind.description}</span>
                        </button>
                      );
                    })}
                  </div>
                  {isEdit && (
                    <FieldDescription>
                      Jenis program tidak dapat diubah setelah dibuat.
                    </FieldDescription>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="scheduleDays"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel id="program-schedule-label">Jadwal</FieldLabel>
                  <div
                    role="group"
                    aria-labelledby="program-schedule-label"
                    className="grid grid-cols-7 gap-1.5"
                  >
                    {WEEKDAYS.map((day) => {
                      const on = field.value.includes(day.iso);
                      return (
                        <button
                          key={day.iso}
                          type="button"
                          aria-pressed={on}
                          aria-label={day.long}
                          disabled={isPending}
                          onClick={() =>
                            field.onChange(
                              on
                                ? field.value.filter((d) => d !== day.iso)
                                : [...field.value, day.iso],
                            )
                          }
                          className={cn(
                            "h-10 rounded-xl border text-xs font-semibold transition-colors",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                          )}
                        >
                          {day.short}
                        </button>
                      );
                    })}
                  </div>
                  <FieldDescription>
                    <span className="font-medium text-foreground">
                      {scheduleLabel(field.value)}
                    </span>
                    {" · "}anggota hanya bisa melapor pada hari terjadwal. Tidak memilih hari =
                    setiap hari.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Field data-invalid={Boolean(errors.description) || undefined}>
              <FieldLabel htmlFor="program-description">
                Deskripsi <span className="font-normal text-muted-foreground">(opsional)</span>
              </FieldLabel>
              <Textarea
                id="program-description"
                rows={2}
                maxLength={500}
                disabled={isPending}
                className="resize-none"
                {...form.register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={Boolean(errors.startDate) || undefined}>
                <FieldLabel htmlFor="program-start">Mulai</FieldLabel>
                <Input
                  id="program-start"
                  type="date"
                  disabled={isPending}
                  {...form.register("startDate")}
                />
                <FieldError errors={[errors.startDate]} />
              </Field>
              <Field data-invalid={Boolean(errors.endDate) || undefined}>
                <FieldLabel htmlFor="program-end">Selesai</FieldLabel>
                <Input
                  id="program-end"
                  type="date"
                  disabled={isPending}
                  {...form.register("endDate")}
                />
                <FieldError errors={[errors.endDate]} />
              </Field>
            </div>
            <FieldDescription className="-mt-2">
              Kosongkan tanggal bila program berjalan tanpa batas waktu.
            </FieldDescription>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button type="submit" form="program-form" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" aria-hidden />}
            {isEdit ? "Simpan perubahan" : "Buat program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
