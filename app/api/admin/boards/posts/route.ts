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

  const sp = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10))
  const perPage = 25
  const threadId = sp.get('threadId')
  const status = sp.get('status')

  const scoped = !isGlobalModeratorOrAdmin(access)
  const moderatedIds = Array.from(access.moderatedBoardIds)

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT p.*, t."title" AS thread_title, t."slug" AS thread_slug, t."board_id" AS board_id
    FROM "brd_posts" p
    JOIN "brd_threads" t ON t."id" = p."thread_id"
    WHERE
      (${!scoped} OR t."board_id" = ANY(${moderatedIds}))
      AND (${threadId ?? null}::text IS NULL OR p."thread_id" = ${threadId ?? null})
      AND (${status ?? null}::text IS NULL OR p."status" = ${status ?? null})
    ORDER BY p."created_at" DESC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `
  return NextResponse.json({ posts: rows, page, perPage })
}
