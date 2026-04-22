import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/router";
import { verifyGoogleIdToken } from "./lib/verify";

export interface Env {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;
  GEMINI_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  FRONTEND_ORIGIN: string;
  BROADCAST_SECRET: string;
  REALTIME_URL?: string;
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function buildCorsHeaders(origin: string | null, allowed: string): Record<string, string> {
  // RELAXATION: Allow any localhost/127.0.0.1 in development
  const isDevelopment = allowed.includes("localhost") || allowed.includes("127.0.0.1");
  const isLocalOrigin = origin?.includes("localhost") || origin?.includes("127.0.0.1");

  if (isDevelopment && isLocalOrigin) {
    return {
      "Access-Control-Allow-Origin": origin!,
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-trpc-source, trpc-batch-mode",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
  }

  if (!allowed || origin !== allowed) {
    console.warn(`[CORS] Rejected origin: ${origin} (Allowed: ${allowed})`);
    return { "Vary": "Origin" };
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-trpc-source, trpc-batch-mode",
    "Vary": "Origin",
  };
}

function json(data: unknown, corsHeaders: Record<string, string>, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...SECURITY_HEADERS,
      ...corsHeaders,
    },
    ...init,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const corsHeaders = buildCorsHeaders(origin, env.FRONTEND_ORIGIN ?? "");

    console.log(`[API] ${request.method} ${url.pathname} (Origin: ${origin || 'none'})`);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...corsHeaders, ...SECURITY_HEADERS } });
    }

    // ── tRPC ─────────────────────────────────────────────────────────────────
    if (url.pathname.startsWith("/trpc")) {
      return fetchRequestHandler({
        endpoint: "/trpc",
        req: request,
        router: appRouter,
        createContext: async () => {
          const authHeader = request.headers.get("Authorization");
          const rawToken = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : null;

          const clientIp =
            request.headers.get("CF-Connecting-IP") ??
            request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ??
            null;

          if (!rawToken) return { env, userId: null, clientIp };

          const userId = await verifyGoogleIdToken(rawToken, env.GOOGLE_CLIENT_ID);
          if (!userId) console.warn("[AUTH] Invalid token provided");

          return { env, userId, clientIp };
        },
        responseMeta() {
          return { headers: { ...corsHeaders, ...SECURITY_HEADERS } };
        },
        onError: ({ path, error }) => {
          console.error(`[tRPC] Error on path '${path}':`, error);
        },
      });
    }

    // ── Liveness probe ────────────────────────────────────────────────────────
    if (url.pathname === "/health") {
      return json({ ok: true, service: "threezinc-api" }, corsHeaders);
    }

    // ── Readiness probe (probes D1) ───────────────────────────────────────────
    if (url.pathname === "/ready") {
      try {
        await env.DB.prepare("SELECT 1").run();
        return json({ ok: true }, corsHeaders);
      } catch {
        return json({ ok: false, message: "Database unavailable." }, corsHeaders, { status: 503 });
      }
    }

    return json({ error: "Not found" }, corsHeaders, { status: 404 });
  },
};
