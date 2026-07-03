import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess, isAnyModerator, isGlobalModeratorOrAdmin } from '@/modules/boards/lib/permissions'

export async function GET(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!isAnyModerator(access)) return errorResponse('Forbidden', 403)

  const status = request.nextUrl.searchParams.get('status') ?? 'OPEN'
  const scoped = !isGlobalModeratorOrAdmin(access)
  const moderatedIds = Array.from(access.moderatedBoardIds)

  const reports = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT r.*,
      CASE WHEN r."item_type" = 'THREAD' THEN t."board_id" ELSE p_thread."board_id" END AS board_id
    FROM "brd_reports" r
    LEFT JOIN "brd_threads" t ON r."item_type" = 'THREAD' AND t."id" = r."item_id"
    LEFT JOIN "brd_posts" p ON r."item_type" = 'POST' AND p."id" = r."item_id"
    LEFT JOIN "brd_threads" p_thread ON p_thread."id" = p."thread_id"
    WHERE r."status" = ${status}
      AND (${!scoped} OR COALESCE(t."board_id", p_thread."board_id") = ANY(${moderatedIds}))
    ORDER BY r."created_at" ASC
  `
  return NextResponse.json({ reports })
}
