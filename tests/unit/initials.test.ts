import { describe, expect, it } from "vitest";

import { initials } from "@/lib/initials";

describe("initials", () => {
  it("uses first and last word", () => {
    expect(initials("Ahmad Fauzan", "a@x.test")).toBe("AF");
    expect(initials("Siti Nur Aisyah", "a@x.test")).toBe("SA");
  });

  it("skips words without letters or digits", () => {
    expect(initials("Ustadz Hafidz (test)", "a@x.test")).toBe("UT");
    expect(initials("Budi -", "a@x.test")).toBe("BU");
  });

  it("falls back to the email when there is no usable name", () => {
    expect(initials(null, "rizki.m@x.test")).toBe("RI");
    expect(initials("  ", "zaid@x.test")).toBe("ZA");
  });
});
