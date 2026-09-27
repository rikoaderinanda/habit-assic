/**
 * Post-deploy smoke test — read-only, creates no data, needs no credentials.
 *
 *   npm run smoke -- https://subuh-tracker.vercel.app
 *
 * Exits non-zero when any check fails.
 */
const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: npm run smoke -- https://your-domain");
  process.exit(2);
}
const isHttps = base.startsWith("https://");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });
const get = (path, init = {}) => fetch(base + path, { redirect: "manual", ...init });

async function main() {
  // Login page + headers
  const login = await get("/login");
  const html = await login.text();
  check("GET /login → 200", login.status === 200, String(login.status));
  check("login page renders", html.includes("Login dengan Google"));
  check("noindex meta", /<meta name="robots" content="noindex, nofollow"/.test(html));
  const h = login.headers;
  check("X-Frame-Options: DENY", h.get("x-frame-options") === "DENY");
  check("X-Content-Type-Options: nosniff", h.get("x-content-type-options") === "nosniff");
  check("Referrer-Policy", h.get("referrer-policy") === "strict-origin-when-cross-origin");
  check("no X-Powered-By", !h.get("x-powered-by"));
  if (isHttps) check("HSTS", (h.get("strict-transport-security") ?? "").includes("max-age="));

  // Auth protection
  const dash = await get("/dashboard");
  check(
    "/dashboard without session → /login",
    [302, 303, 307, 308].includes(dash.status) &&
      /\/login\?callbackUrl=/.test(dash.headers.get("location") ?? ""),
    `${dash.status} ${dash.headers.get("location")}`,
  );
  const admin = await get("/admin/members");
  check(
    "/admin/members without session → /login",
    /\/login/.test(admin.headers.get("location") ?? ""),
    String(admin.status),
  );
  const api = await get("/api/admin/export");
  check("/api/admin/export without session → 401", api.status === 401, String(api.status));

  // Auth.js wiring
  const providers = await (await get("/api/auth/providers")).json().catch(() => ({}));
  const expectedCallback = `${base}/api/auth/callback/google`;
  check(
    "Google provider callback URL",
    providers.google?.callbackUrl === expectedCallback,
    providers.google?.callbackUrl ?? "missing",
  );
  const csrf = await get("/api/auth/csrf");
  const setCookie = csrf.headers.getSetCookie?.() ?? [csrf.headers.get("set-cookie") ?? ""];
  check("CSRF endpoint", csrf.status === 200, String(csrf.status));
  if (isHttps)
    check(
      "auth cookies are Secure + HttpOnly",
      setCookie.length > 0 &&
        setCookie.every((c) => /;\s*Secure/i.test(c) && /;\s*HttpOnly/i.test(c)),
      setCookie.map((c) => c.split(";")[0].split("=")[0]).join(", "),
    );

  // Public assets
  for (const [path, type] of [
    ["/manifest.webmanifest", "application/manifest+json"],
    ["/icon.svg", "image/svg+xml"],
    ["/apple-icon", "image/png"],
    ["/pwa-icon/192", "image/png"],
    ["/robots.txt", "text/plain"],
  ]) {
    const res = await get(path);
    check(
      `${path} → 200 ${type}`,
      res.status === 200 && (res.headers.get("content-type") ?? "").startsWith(type),
      `${res.status} ${res.headers.get("content-type")}`,
    );
  }
  const robots = await (await get("/robots.txt")).text();
  check("robots.txt disallows all", /Disallow: \/\s*$/m.test(robots));

  const width = Math.max(...results.map((r) => r.name.length));
  for (const r of results)
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(width)}  ${r.ok ? "" : r.detail}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed for ${base}`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error("Smoke test crashed:", error.message);
  process.exit(1);
});
