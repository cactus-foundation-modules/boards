// Per-instance, in-memory request ceiling for the public counters (views,
// reactions) - endpoints that are cheap individually but write a row per call,
// so an unthrottled script can fill a table or inflate a count. Resets on cold
// start and is not shared between serverless instances: a last line of defence
// behind validation, not an exact quota. Kept inside the module rather than
// borrowed from another one, so it works on a site that has only this module.

type Bucket = { count: number; windowStart: number }
const buckets = new Map<string, Bucket>()

// Closed windows are swept on every Nth write rather than on a timer, so a
// long-lived instance does not keep every visitor it ever saw.
const SWEEP_EVERY = 512
let writesSinceSweep = 0

export function allowRequest(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  if (++writesSinceSweep >= SWEEP_EVERY) {
    writesSinceSweep = 0
    for (const [k, b] of buckets) if (now - b.windowStart > windowMs) buckets.delete(k)
  }
  const bucket = buckets.get(key)
  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now })
    return true
  }
  if (bucket.count >= maxRequests) return false
  bucket.count += 1
  return true
}
