import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL wajib diisi")
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "DATABASE_URL harus berupa URL PostgreSQL"),
  DIRECT_URL: z
    .string()
    .min(1, "DIRECT_URL wajib diisi")
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "DIRECT_URL harus berupa URL PostgreSQL"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET minimal 32 karakter (jalankan: npx auth secret)"),
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID wajib diisi"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "AUTH_GOOGLE_SECRET wajib diisi"),
  ADMIN_EMAILS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(z.array(z.email("ADMIN_EMAILS berisi email yang tidak valid"))),
  APP_TIMEZONE: z
    .string()
    .default("Asia/Jakarta")
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "APP_TIMEZONE bukan zona waktu IANA yang valid"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/**
 * Validated server environment. Parsed lazily on first access so that pages
 * which don't touch the DB/auth still render, but any code path that does
 * fails fast with a readable message listing every missing variable.
 */
export function getEnv(): ServerEnv {
  if (cached) return cached;

  const raw = {
    ...process.env,
    // Auth.js v5 reads AUTH_GOOGLE_*; accept the GOOGLE_CLIENT_* names from the brief as aliases.
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
  };

  const parsed = serverEnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment variable tidak valid:\n${issues}\nLihat .env.example.`);
  }

  cached = parsed.data;
  return cached;
}
