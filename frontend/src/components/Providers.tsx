"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { getSession, SessionProvider, signIn, useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { trpc, getBaseUrl } from "../lib/trpc";
import superjson from "superjson";

function SessionErrorHandler() {
  const { data: session } = useSession();
  const error = (session as any)?.error;

  useEffect(() => {
    if (error === "RefreshTokenExpired" || error === "RefreshTokenMissing") {
      // Token can no longer be refreshed — force a clean re-authentication
      signIn("google");
    }
  }, [error]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/trpc`,
          transformer: superjson,
          async headers() {
            // Optimization: Avoid redundant getSession calls for every batch if possible.
            // NextAuth's getSession is already somewhat cached, but the JWTSessionError 
            // made it extremely slow.
            try {
              const session = await getSession();
              const idToken = (session as any)?.idToken;
              if (idToken) {
                return { Authorization: `Bearer ${idToken}` };
              }
            } catch (e) {
              console.error("[TRPC] Header session fetch failed", e);
            }
            return {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <SessionErrorHandler />
          {children}
        </SessionProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
