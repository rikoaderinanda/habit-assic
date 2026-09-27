import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    // Only the id lives in the session; role/status are read from the DB (src/server/guards.ts).
    user: { id: string } & DefaultSession["user"];
  }
}
