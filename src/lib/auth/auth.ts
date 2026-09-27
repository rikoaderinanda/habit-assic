import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { recordSignIn } from "@/server/auth-sync";

import { authConfig } from "./auth.config";

const env = getEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  secret: env.AUTH_SECRET,
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      // We only need the identity, not Google API access: don't persist
      // access/refresh/id tokens in the accounts table.
      account: (tokens) => ({ token_type: tokens.token_type, scope: tokens.scope }),
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      if (!profile?.email || profile.email_verified !== true) {
        return "/login?error=EmailNotVerified";
      }

      const existing = await prisma.user.findUnique({
        where: { email: profile.email },
        select: { isActive: true },
      });
      if (existing && !existing.isActive) return "/login?error=AccountDisabled";

      return true;
    },
  },
  events: {
    // Awaited by Auth.js before the redirect, so the role is correct on the first page load.
    async signIn({ user, profile, isNewUser }) {
      if (!user.id) return;
      await recordSignIn({
        userId: user.id,
        name: profile?.name ?? user.name ?? null,
        image: typeof profile?.picture === "string" ? profile.picture : (user.image ?? null),
        isNewUser: Boolean(isNewUser),
      });
    },
  },
});
