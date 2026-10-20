// Best-effort request limiter for public endpoints (booking, feedback, opt-out).
//
// It counts requests per IP in memory. On Vercel each serverless instance has
// its own memory, so this stops casual spam and scripts hammering one endpoint,
// but it is NOT a hard global limit. For a hard limit, move the counters to
// Upstash Redis or Vercel KV later (same function signature).

const buckets = new Map();
let lastSweep = 0;

export function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : String(fwd || "").split(",")[0];
  return (first || req.socket?.remoteAddress || "unknown").trim();
}

/**
 * Returns true if the request may proceed. When it returns false, a 429 JSON
 * response has already been sent, so the caller should simply `return`.
 */
export function rateLimit(req, res, { name, limit, windowMs }) {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
  const key = `${name}:${clientIp(req)}`;
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > limit) {
    res.setHeader("Retry-After", String(Math.ceil((b.resetAt - now) / 1000)));
    res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
    return false;
  }
  return true;
}
