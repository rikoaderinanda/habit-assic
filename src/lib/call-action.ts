"use client";

import { toast } from "sonner";

export const NETWORK_ERROR_MESSAGE =
  "Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.";

/**
 * Calls a Server Action from the client. Expected failures come back as
 * result objects; a thrown error means the request itself failed (offline,
 * timeout, deploy in progress), so show one clear toast and return null.
 */
export async function callAction<T>(action: () => Promise<T>): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    console.error("[action] request failed", error);
    toast.error(NETWORK_ERROR_MESSAGE);
    return null;
  }
}
