import type { ActivityStatus } from "@prisma/client";

import type { DayState } from "./stats";

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  JAMAAH: "Berjamaah",
  SENDIRI: "Sendiri",
  HADIR: "Sudah tadarus",
};

export const DAY_STATE_LABEL: Record<DayState, string> = {
  JAMAAH: "Berjamaah",
  SENDIRI: "Sendiri",
  HADIR: "Sudah tadarus",
  MISSED: "Belum isi",
  PENDING: "Hari ini",
  OUTSIDE: "Di luar periode",
  OFF: "Tidak ada jadwal",
  FUTURE: "Belum tiba",
};
