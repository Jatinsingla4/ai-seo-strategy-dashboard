/**
 * Sliding-window rate limiter backed by Cloudflare KV.
 * KV has eventual consistency, so counts may be slightly off under very high
 * concurrency — acceptable for abuse prevention (a few extra requests allowed
 * is far better than failing legitimate users).
 */
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limitPerMinute: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowMs = 60_000;
  const now = Date.now();
  const windowKey = `rl:${key}:${Math.floor(now / windowMs)}`;

  const raw = await kv.get(windowKey);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= limitPerMinute) {
    return { allowed: false, remaining: 0 };
  }

  // Increment; TTL set to 2 windows so the key cleans itself up
  await kv.put(windowKey, String(count + 1), { expirationTtl: 120 });
  return { allowed: true, remaining: limitPerMinute - count - 1 };
}
