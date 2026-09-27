import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config, shared by the middleware and the full config in `auth.ts`.
 *
 * It must not import Prisma or anything Node-only: the middleware runs on the
 * Edge runtime. The JWT only carries the user id (`sub`); role and active
 * status are always read from the database by the server guards, so role
 * changes take effect immediately without re-login.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    // Auth.js appends ?error=<code>; the login page renders a friendly message.
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // re-issue the cookie at most once a day
  },
  providers: [], // added in auth.ts (Node runtime only)
  callbacks: {
    /** Runs in the middleware for every matched request. */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);

      if (pathname === "/login") return true;

      if (!isLoggedIn && pathname.startsWith("/api/")) {
        return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
      }

      // false → redirect to /login?callbackUrl=<current url>
      return isLoggedIn;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
