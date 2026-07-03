import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'

export async function GET(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!access.canModerate) return errorResponse('Forbidden', 403)

  const status = request.nextUrl.searchParams.get('status') ?? 'OPEN'

  const items = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT q.*,
      CASE WHEN q."item_type" = 'THREAD' THEN t."title" ELSE p_thread."title" END AS title,
      CASE WHEN q."item_type" = 'THREAD' THEN t."board_id" ELSE p_thread."board_id" END AS board_id
    FROM "brd_moderation_queue" q
    LEFT JOIN "brd_threads" t ON q."item_type" = 'THREAD' AND t."id" = q."item_id"
    LEFT JOIN "brd_posts" p ON q."item_type" = 'POST' AND p."id" = q."item_id"
    LEFT JOIN "brd_threads" p_thread ON p_thread."id" = p."thread_id"
    WHERE q."status" = ${status}
    ORDER BY q."created_at" ASC
  `
  return NextResponse.json({ items })
}
