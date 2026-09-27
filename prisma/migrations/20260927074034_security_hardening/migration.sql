-- Security hardening for Supabase.
--
-- Supabase exposes the `public` schema through its Data API (PostgREST) to the
-- `anon` and `authenticated` roles. This app never uses that API — all access
-- goes through Prisma on the server as the table owner, which bypasses RLS.
-- Enabling RLS with no policies therefore blocks the Data API completely while
-- leaving the app unaffected.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "logs" ENABLE ROW LEVEL SECURITY;

-- Prisma's bookkeeping table (absent in the shadow database, hence the guard).
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Program window must be well-formed.
ALTER TABLE "programs"
  ADD CONSTRAINT "programs_date_window_check"
  CHECK ("end_date" IS NULL OR "start_date" IS NULL OR "end_date" >= "start_date");
