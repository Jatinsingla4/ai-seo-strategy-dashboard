import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  id_token: string;
  expires_at: number;
} | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    return {
      access_token: data.access_token,
      id_token: data.id_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    };
  } catch {
    return null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // Request offline access so Google provides a refresh_token
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist tokens and expiry
      if (account) {
        return {
          ...token,
          idToken: account.id_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
        };
      }

      // Token still valid — return as-is
      if (Date.now() / 1000 < (token.expiresAt as number) - 60) {
        return token;
      }

      // Token expired — attempt refresh
      if (!token.refreshToken) {
        return { ...token, error: "RefreshTokenMissing" };
      }

      const refreshed = await refreshGoogleToken(token.refreshToken as string);
      if (!refreshed) {
        return { ...token, error: "RefreshTokenExpired" };
      }

      return {
        ...token,
        idToken: refreshed.id_token,
        expiresAt: refreshed.expires_at,
        error: undefined,
      };
    },

    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      (session as any).idToken = token.idToken;
      (session as any).error = token.error;
      return session;
    },
  },
});
