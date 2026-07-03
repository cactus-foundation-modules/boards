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
  const boardId = sp.get('boardId')
  const status = sp.get('status')
  const q = sp.get('q')

  const scoped = !isGlobalModeratorOrAdmin(access)
  const moderatedIds = Array.from(access.moderatedBoardIds)

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT t.*, b."title" AS board_title, b."slug" AS board_slug
    FROM "brd_threads" t
    JOIN "brd_boards" b ON b."id" = t."board_id"
    WHERE
      (${!scoped} OR t."board_id" = ANY(${moderatedIds}))
      AND (${boardId ?? null}::text IS NULL OR t."board_id" = ${boardId ?? null})
      AND (${status ?? null}::text IS NULL OR t."status" = ${status ?? null})
      AND (${q ?? null}::text IS NULL OR t."title" ILIKE '%' || ${q ?? null} || '%')
    ORDER BY t."created_at" DESC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `
  const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) FROM "brd_threads" t
    WHERE
      (${!scoped} OR t."board_id" = ANY(${moderatedIds}))
      AND (${boardId ?? null}::text IS NULL OR t."board_id" = ${boardId ?? null})
      AND (${status ?? null}::text IS NULL OR t."status" = ${status ?? null})
      AND (${q ?? null}::text IS NULL OR t."title" ILIKE '%' || ${q ?? null} || '%')
  `

  return NextResponse.json({ threads: rows, total: Number(count), page, perPage })
}
