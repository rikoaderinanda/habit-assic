"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
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

import { createProgramAction, updateProgramAction } from "../actions";
import { createProgramSchema, slugify, type CreateProgramInput } from "../schemas";

type Initial = {
  id: string;
  slug: string;
  name: string;
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
