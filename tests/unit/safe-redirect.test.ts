import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps same-origin relative paths with query and hash", () => {
    expect(safeRedirectPath("/dashboard/stats?month=2026-09#cal")).toBe(
      "/dashboard/stats?month=2026-09#cal",
    );
    expect(safeRedirectPath("/admin/members")).toBe("/admin/members");
  });

  it("strips the origin from absolute URLs (Auth.js sends full callback URLs)", () => {
    expect(safeRedirectPath("http://localhost:3000/admin/dashboard")).toBe("/admin/dashboard");
  });

  it("never redirects to another host", () => {
    expect(safeRedirectPath("https://evil.example/phish")).toBe("/phish");
    expect(safeRedirectPath("//evil.example/x")).toBe("/x");
    // WHATWG URL treats a backslash as "/", so this parses as host evil.example; only its path survives.
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("falls back for empty, non-string, oversized or auth-loop values", () => {
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath("")).toBe("/dashboard");
    expect(safeRedirectPath(`/${"a".repeat(3000)}`)).toBe("/dashboard");
    expect(safeRedirectPath("/login?callbackUrl=/login")).toBe("/dashboard");
    expect(safeRedirectPath("/api/auth/signout")).toBe("/dashboard");
  });

  it("supports a custom fallback", () => {
    expect(safeRedirectPath(undefined, "/admin/dashboard")).toBe("/admin/dashboard");
  });
});
