import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/auth.config";

// Edge runtime: only verifies the session cookie (see authConfig.callbacks.authorized).
// Role checks happen on the server via requireAdmin()/assertAdmin().
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Everything except Auth.js endpoints, Next internals, app icons/manifest and static files.
    "/((?!api/auth|_next/static|_next/image|icon|apple-icon|pwa-icon|manifest.webmanifest|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)",
  ],
};
