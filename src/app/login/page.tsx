import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import { IslamicPattern } from "@/components/shared/islamic-pattern";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleSignInButton } from "@/features/users/components/google-sign-in-button";
import { SignOutButton } from "@/features/users/components/sign-out-button";
import { signInWithGoogle } from "@/lib/auth/actions";
import { auth } from "@/lib/auth/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/server/guards";

export const metadata: Metadata = { title: "Login" };

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Akses ditolak",
    description: "Akun Google ini tidak diizinkan masuk. Hubungi pengurus asrama.",
  },
  AccountDisabled: {
    title: "Akun dinonaktifkan",
    description:
      "Akun Anda sudah dinonaktifkan oleh pengurus asrama. Hubungi admin bila ini keliru.",
  },
  EmailNotVerified: {
    title: "Email belum terverifikasi",
    description: "Gunakan akun Google dengan email yang sudah terverifikasi.",
  },
  SessionInvalid: {
    title: "Sesi tidak berlaku",
    description:
      "Akun Anda tidak aktif lagi atau sesi sudah kedaluwarsa. Silakan keluar lalu login kembali.",
  },
  Configuration: {
    title: "Login sedang bermasalah",
    description: "Terjadi kesalahan konfigurasi di server. Coba lagi beberapa saat lagi.",
  },
};

const FALLBACK_ERROR = {
  title: "Login gagal",
  description: "Terjadi kesalahan saat login dengan Google. Silakan coba lagi.",
};

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = safeRedirectPath(
    Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl,
  );
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;

  const user = await getCurrentUser();
  if (user) redirect(callbackUrl);

  // A session cookie exists but its user is gone/deactivated: offer to clear it.
  const hasStaleSession = Boolean((await auth())?.user);
  const error =
    errorCode === "SessionInvalid" && !hasStaleSession
      ? null
      : errorCode
        ? (ERROR_MESSAGES[errorCode] ?? FALLBACK_ERROR)
        : hasStaleSession
          ? ERROR_MESSAGES.SessionInvalid
          : null;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent"
      />
      <IslamicPattern className="absolute inset-x-0 top-0 h-[28rem] [mask-image:linear-gradient(to_bottom,black,transparent)] text-primary/10" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <BrandMark />

        <div className="flex flex-1 flex-col justify-center gap-8 py-10">
          <div className="space-y-3">
            <p className="text-sm font-medium text-primary">Assalamu&apos;alaikum</p>
            <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance">
              Jaga Subuh, jaga istiqamah.
            </h1>
            <p className="text-pretty text-muted-foreground">
              Catat Shalat Subuh setiap hari dan pantau pencapaian Anda selama sebulan.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle aria-hidden />
              <AlertTitle>{error.title}</AlertTitle>
              <AlertDescription>{error.description}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
            {hasStaleSession ? (
              <SignOutButton label="Keluar & login ulang" className="h-12 w-full rounded-xl" />
            ) : (
              <form action={signInWithGoogle}>
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
                <GoogleSignInButton />
              </form>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Anggota baru otomatis terdaftar saat login pertama.
            </p>
          </div>
        </div>

        <figure className="space-y-1.5 border-l-2 border-primary/40 pl-4 text-sm">
          <blockquote className="text-muted-foreground italic">
            &ldquo;Barang siapa shalat Subuh, maka ia berada dalam jaminan Allah.&rdquo;
          </blockquote>
          <figcaption className="text-xs font-medium text-foreground/70">HR. Muslim</figcaption>
        </figure>
      </div>
    </main>
  );
}
