import { describe, expect, it } from "vitest";

import {
  buildMonitoringRows,
  dailyParticipation,
  monitoringQuerySchema,
  paginate,
  sortRows,
  type MemberInfo,
  type MonitoringRow,
} from "@/features/users/lib/monitoring";
import { escapeCsvCell, toCsv } from "@/lib/csv";
import { parseDateKey } from "@/lib/date";

const d = (key: string) => parseDateKey(key);
const WIB = "Asia/Jakarta";

function member(id: string, name: string | null, joinedUtc = "2026-08-01T00:00:00Z"): MemberInfo {
  return {
    id,
    name,
    email: `${id}@x.test`,
    image: null,
    role: "USER",
    isActive: true,
    createdAt: new Date(joinedUtc),
  };
}

describe("buildMonitoringRows", () => {
  it("computes per-member monthly numbers consistent with the member view", () => {
    const rows = buildMonitoringRows({
      members: [member("a", "Ali"), member("b", "Budi", "2026-09-19T17:30:00Z")], // Budi joins 20 Sep WIB
      activities: [
        { userId: "a", date: d("2026-09-01"), status: "JAMAAH" },
        { userId: "a", date: d("2026-09-02"), status: "SENDIRI" },
        { userId: "b", date: d("2026-09-20"), status: "JAMAAH" },
        { userId: "zzz", date: d("2026-09-01"), status: "JAMAAH" }, // unknown member ignored
      ],
      month: { year: 2026, month: 9 },
      today: d("2026-09-21"),
      program: { startDate: null, endDate: null, scheduleDays: [] },
      timeZone: WIB,
    });

    expect(rows[0]).toMatchObject({
      jamaah: 1,
      sendiri: 1,
      totalInput: 2,
      missed: 18,
      effectiveDays: 20,
      percentage: 5,
    });
    // Budi: 20 Sep reported, 21 Sep is today (pending) → 1 effective day.
    expect(rows[1]).toMatchObject({
      jamaah: 1,
      sendiri: 0,
      missed: 0,
      effectiveDays: 1,
      percentage: 100,
    });
  });
});

describe("sortRows / paginate", () => {
  const rows = [
    { ...member("1", "citra"), totalInput: 5, jamaah: 5, sendiri: 0, percentage: 50 },
    { ...member("2", "Ahmad"), totalInput: 9, jamaah: 3, sendiri: 6, percentage: 30 },
    { ...member("3", "budi"), totalInput: 9, jamaah: 8, sendiri: 1, percentage: 80 },
    { ...member("4", null), totalInput: 0, jamaah: 0, sendiri: 0, percentage: 0 },
  ] as MonitoringRow[];
  const ids = (list: MonitoringRow[]) => list.map((r) => r.id);

  it("sorts by name case-insensitively, falling back to email", () => {
    expect(ids(sortRows(rows, "name", "asc"))).toEqual(["4", "2", "3", "1"]); // "4@x.test" < "Ahmad"
  });

  it("sorts numerically in both directions with a stable name tie-break", () => {
    expect(ids(sortRows(rows, "percentage", "desc"))).toEqual(["3", "1", "2", "4"]);
    expect(ids(sortRows(rows, "input", "desc"))).toEqual(["2", "3", "1", "4"]); // Ahmad before budi on tie
    expect(ids(sortRows(rows, "sendiri", "asc"))).toEqual(["4", "1", "3", "2"]);
  });

  it("does not mutate its input", () => {
    const copy = [...rows];
    sortRows(rows, "percentage", "asc");
    expect(rows).toEqual(copy);
  });

  it("paginates and clamps out-of-range pages", () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    expect(paginate(items, 1, 20)).toMatchObject({ page: 1, pageCount: 3, total: 45 });
    expect(paginate(items, 3, 20).items).toEqual([40, 41, 42, 43, 44]);
    expect(paginate(items, 99, 20).page).toBe(3);
    expect(paginate([], 1, 20)).toMatchObject({ page: 1, pageCount: 1, total: 0, items: [] });
  });
});

describe("monitoringQuerySchema", () => {
  it("falls back to safe defaults for junk input", () => {
    expect(
      monitoringQuerySchema.parse({ sort: "DROP TABLE", dir: "sideways", page: "-3", status: "x" }),
    ).toEqual({
      q: "",
      sort: "name",
      dir: "asc",
      page: 1,
      status: "active",
    });
  });

  it("parses valid params", () => {
    expect(
      monitoringQuerySchema.parse({
        q: "  ali ",
        sort: "percentage",
        dir: "desc",
        page: "2",
        status: "inactive",
      }),
    ).toEqual({
      q: "ali",
      sort: "percentage",
      dir: "desc",
      page: 2,
      status: "inactive",
    });
  });
});

describe("dailyParticipation", () => {
  it("counts members from their join day and reports per day", () => {
    const points = dailyParticipation({
      today: d("2026-09-03"),
      days: 3,
      members: [
        { id: "a", createdAt: new Date("2026-08-01T00:00:00Z") },
        { id: "b", createdAt: new Date("2026-09-01T18:00:00Z") }, // joins 2 Sep WIB
      ],
      activities: [
        { userId: "a", date: d("2026-09-01"), status: "JAMAAH" },
        { userId: "a", date: d("2026-09-02"), status: "SENDIRI" },
        { userId: "b", date: d("2026-09-02"), status: "JAMAAH" },
        { userId: "ghost", date: d("2026-09-03"), status: "JAMAAH" },
      ],
      program: { startDate: null, endDate: null, scheduleDays: [] },
      timeZone: WIB,
    });
    expect(points.map((p) => [p.key, p.members, p.jamaah, p.sendiri, p.missed])).toEqual([
      ["2026-09-01", 1, 1, 0, 0],
      ["2026-09-02", 2, 1, 1, 0],
      ["2026-09-03", 2, 0, 0, 2],
    ]);
  });

  it("reports zero members outside the program window", () => {
    const points = dailyParticipation({
      today: d("2026-09-02"),
      days: 2,
      members: [{ id: "a", createdAt: new Date("2026-08-01T00:00:00Z") }],
      activities: [],
      program: { startDate: d("2026-09-02"), endDate: null, scheduleDays: [] },
      timeZone: WIB,
    });
    expect(points.map((p) => p.members)).toEqual([0, 1]);
  });
});

describe("CSV", () => {
  it("quotes separators, quotes and newlines", () => {
    expect(escapeCsvCell('Ali "Abu" Bakar')).toBe('"Ali ""Abu"" Bakar"');
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(escapeCsvCell(83)).toBe("83");
    expect(escapeCsvCell(null)).toBe("");
  });

  it("neutralises spreadsheet formula injection", () => {
    expect(escapeCsvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(escapeCsvCell("+62812")).toBe("'+62812");
    expect(escapeCsvCell("-1")).toBe("'-1");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("emits a BOM and CRLF line endings", () => {
    expect(
      toCsv([
        ["Nama", "Persentase"],
        ["Ali", 83],
      ]),
    ).toBe("﻿Nama,Persentase\r\nAli,83\r\n");
  });
});
