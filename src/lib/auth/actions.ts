"use server";

import { safeRedirectPath } from "@/lib/safe-redirect";

import { signIn, signOut } from "./auth";

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeRedirectPath(formData.get("callbackUrl")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
