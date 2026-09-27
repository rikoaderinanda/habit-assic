// Load .env for integration tests (Next.js does this for the app; Vitest does not).
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: integration suites skip themselves when DATABASE_URL is missing.
}
