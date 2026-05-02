/**
 * Sliding-window rate limiter with optional global backing store.
 *
 * If `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are configured in
 * the Vercel environment, the limiter shares state across all serverless
 * instances via Upstash's REST API (works on Edge runtime too).
 *
 * Without those env vars, it falls back to a per-instance in-memory Map —
 * which is roughly the legacy behaviour. That's still better than nothing
 * (it costs a bot one Vercel cold-start per IP to bypass), but a determined
 * attacker fanning out across distributed IPs can run up function-seconds.
 *
 * Setup (when traffic justifies it):
 *   1. Sign up at https://upstash.com (free tier 10k cmds/day is plenty for
 *      rate limiting). Create a Redis database, region nearest to Vercel
 *      project (e.g. ap-northeast-1).
 *   2. Copy "REST URL" and "REST TOKEN" values.
 *   3. In Vercel project → Settings → Environment Variables, add
 *      UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for Production.
 *   4. Redeploy. No code change needed — this module auto-detects.
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const HAS_UPSTASH = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

const memoryStore = new Map<string, number[]>();

type PipelineCommand = (string | number)[];

async function upstashPipeline(commands: PipelineCommand[]): Promise<unknown[]> {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(2000),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`upstash pipeline ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  return data.map((d) => d.result);
}

/**
 * Returns true when the bucket has exceeded `max` requests within the last
 * `windowMs` milliseconds. Each call counts as one hit.
 *
 * Uses a Redis sorted-set sliding window when Upstash is configured;
 * otherwise an in-memory equivalent.
 */
export async function isRateLimited(
  bucketKey: string,
  windowMs: number,
  max: number,
): Promise<boolean> {
  const now = Date.now();

  if (HAS_UPSTASH) {
    try {
      const key = `rl:${bucketKey}`;
      const cutoff = now - windowMs;
      const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;
      // Sliding window via sorted set:
      //   1. Drop entries older than the window.
      //   2. Add the current hit (score = timestamp).
      //   3. Count remaining members.
      //   4. Refresh TTL so idle keys auto-expire.
      const results = await upstashPipeline([
        ["ZREMRANGEBYSCORE", key, 0, cutoff],
        ["ZADD", key, now, member],
        ["ZCARD", key],
        ["EXPIRE", key, Math.ceil(windowMs / 1000)],
      ]);
      const count = Number(results[2] ?? 0);
      return count > max;
    } catch (err) {
      // Network glitch shouldn't break the API. Fall through to in-memory
      // so the request is still subject to *some* limit.
      console.warn("[rateLimit] Upstash failure, using in-memory fallback:", err);
    }
  }

  const recent = (memoryStore.get(bucketKey) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );
  recent.push(now);
  memoryStore.set(bucketKey, recent);
  return recent.length > max;
}
