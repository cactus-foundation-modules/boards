import { prisma } from '@/lib/db/prisma'

// Self-rolled sliding-window checks against Boards' own tables, mirroring
// Gazette's checkCommentRateLimit pattern rather than core's fixed-action
// lib/auth/rate-limit.ts (whose RateLimitAction union has no module actions).
// Limits are read from brd_settings, not hardcoded.

export async function checkPostCooldown(userId: string, cooldownSeconds: number): Promise<boolean> {
  if (cooldownSeconds <= 0) return true
  const rows = await prisma.$queryRaw<Array<{ created_at: Date }>>`
    SELECT "created_at" FROM "brd_posts" WHERE "author_id" = ${userId}
    UNION ALL
    SELECT "created_at" FROM "brd_threads" WHERE "author_id" = ${userId}
    ORDER BY "created_at" DESC LIMIT 1
  `
  const last = rows[0]
  if (!last) return true
  return Date.now() - last.created_at.getTime() >= cooldownSeconds * 1000
}

export async function checkPostsPerHour(userId: string, limit: number): Promise<boolean> {
  if (limit <= 0) return true
  const rows = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT (
      (SELECT COUNT(*) FROM "brd_posts" WHERE "author_id" = ${userId} AND "created_at" > NOW() - INTERVAL '1 hour')
      +
      (SELECT COUNT(*) FROM "brd_threads" WHERE "author_id" = ${userId} AND "created_at" > NOW() - INTERVAL '1 hour')
    ) AS count
  `
  return Number(rows[0].count) < limit
}
