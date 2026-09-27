/**
 * E2E fixture data. Everything is tagged with the run id (emails and program
 * slugs start with it) so teardown can remove exactly what setup created,
 * without touching real users in the same database.
 */
import fs from "node:fs";
import path from "node:path";

import type { ActivityStatus } from "@prisma/client";

export const AUTH_DIR = path.join(__dirname, "..", ".auth");
export const RUN_FILE = path.join(AUTH_DIR, "run.json");
export const STATE = {
  member: path.join(AUTH_DIR, "member.json"),
  admin: path.join(AUTH_DIR, "admin.json"),
  target: path.join(AUTH_DIR, "target.json"),
};
export const SESSION_COOKIE = "authjs.session-token";
export const FILLER_COUNT = 21;

export type RunInfo = {
  tag: string;
  baseURL: string;
  programSlug: string;
  member: { id: string; name: string; email: string };
  admin: { id: string; name: string; email: string };
  target: { id: string; name: string; email: string };
  /** Members matching a search for `tag` (member + admin + target + fillers). */
  taggedMembers: number;
};

export function readRun(): RunInfo {
  return JSON.parse(fs.readFileSync(RUN_FILE, "utf8")) as RunInfo;
}

/**
 * Deterministic history for the past 13 days (today excluded): every 5th day
 * missed, every 4th reported day SENDIRI, the rest JAMAAH.
 */
export function historyPattern(today: Date): Array<{ date: Date; status: ActivityStatus }> {
  const out: Array<{ date: Date; status: ActivityStatus }> = [];
  for (let i = 13; i >= 1; i--) {
    if (i % 5 === 4) continue;
    out.push({
      date: new Date(today.getTime() - i * 86_400_000),
      status: i % 4 === 3 ? "SENDIRI" : "JAMAAH",
    });
  }
  return out;
}
