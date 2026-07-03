import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

// Tiny payload for the core dashboard widget (BOARDS_SPEC 5.10).
export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.access'))) return errorResponse('Forbidden', 403)

  const [row] = await prisma.$queryRaw<[{ threads: bigint; posts: bigint; open_queue: bigint }]>`
    SELECT
      (SELECT COUNT(*) FROM "brd_threads") AS threads,
      (SELECT COUNT(*) FROM "brd_posts") AS posts,
      (SELECT COUNT(*) FROM "brd_moderation_queue" WHERE "status" = 'OPEN') AS open_queue
  `
  return NextResponse.json({
    threadCount: Number(row.threads),
    postCount: Number(row.posts),
    openQueueCount: Number(row.open_queue),
  })
}
