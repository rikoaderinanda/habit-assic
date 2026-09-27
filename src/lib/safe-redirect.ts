/**
 * Turn an untrusted callbackUrl into a same-origin path, preventing open redirects.
 * Absolute URLs keep only their path/query/hash (the origin is discarded).
 */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;

  let path: string;
  try {
    const url = new URL(value, "http://internal.invalid");
    path = `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }

  // Reject protocol-relative / backslash tricks that some browsers treat as another host.
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  // Never bounce back into the auth flow.
  if (path === "/login" || path.startsWith("/login?") || path.startsWith("/api/auth"))
    return fallback;

  return path;
}
