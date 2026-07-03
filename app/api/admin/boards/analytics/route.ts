import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.access'))) return errorResponse('Forbidden', 403)

  const [totals] = await prisma.$queryRaw<[{ threads: bigint; posts: bigint; members: bigint; views: bigint }]>`
    SELECT
      (SELECT COUNT(*) FROM "brd_threads") AS threads,
      (SELECT COUNT(*) FROM "brd_posts") AS posts,
      (SELECT COUNT(*) FROM "brd_user_profiles") AS members,
      (SELECT COALESCE(SUM("view_count"), 0) FROM "brd_threads") AS views
  `

  const activity = await prisma.$queryRaw<Array<{ day: Date; threads: bigint; posts: bigint }>>`
    SELECT day::date,
      COALESCE((SELECT COUNT(*) FROM "brd_threads" t WHERE t."created_at"::date = day), 0) AS threads,
      COALESCE((SELECT COUNT(*) FROM "brd_posts" p WHERE p."created_at"::date = day), 0) AS posts
    FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') AS day
    ORDER BY day ASC
  `

  const topBoards = await prisma.$queryRaw<Array<{ title: string; thread_count: bigint; post_count: bigint }>>`
    SELECT b."title", COUNT(DISTINCT t."id") AS thread_count, COUNT(p."id") AS post_count
    FROM "brd_boards" b
    LEFT JOIN "brd_threads" t ON t."board_id" = b."id"
    LEFT JOIN "brd_posts" p ON p."thread_id" = t."id"
    GROUP BY b."id", b."title"
    ORDER BY post_count DESC
    LIMIT 10
  `

  const [openQueue] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) FROM "brd_moderation_queue" WHERE "status" = 'OPEN'
  `

  return NextResponse.json({
    totals: { threads: Number(totals.threads), posts: Number(totals.posts), members: Number(totals.members), views: Number(totals.views) },
    activity: activity.map((a) => ({ day: a.day, threads: Number(a.threads), posts: Number(a.posts) })),
    topBoards: topBoards.map((b) => ({ title: b.title, threadCount: Number(b.thread_count), postCount: Number(b.post_count) })),
    openQueueCount: Number(openQueue.count),
  })
}
