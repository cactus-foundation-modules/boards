import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { getVisibleBoardIds } from '@/modules/boards/lib/visibility'
import { getBoardsSettings } from '@/modules/boards/lib/settings'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const q = sp.get('q')?.trim()
  if (!q) return NextResponse.json({ threads: [], total: 0 })

  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10))
  const settings = await getBoardsSettings()
  const perPage = settings.threadsPerPage

  const user = await getSessionFromCookie()
  const access = user ? await getBoardsAccess(user) : null
  const visibleBoardIds = await getVisibleBoardIds(!!user, access)
  if (visibleBoardIds.length === 0) return NextResponse.json({ threads: [], total: 0 })

  const threads = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT t.*, b."title" AS board_title, b."slug" AS board_slug,
      ts_rank(to_tsvector('english', t."title"), plainto_tsquery('english', ${q})) AS rank
    FROM "brd_threads" t
    JOIN "brd_boards" b ON b."id" = t."board_id"
    WHERE t."status" = 'PUBLISHED'
      AND t."board_id" = ANY(${visibleBoardIds})
      AND to_tsvector('english', t."title") @@ plainto_tsquery('english', ${q})
    ORDER BY rank DESC, t."created_at" DESC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `

  const posts = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT t."id", t."title", t."slug", b."title" AS board_title, b."slug" AS board_slug,
      ts_rank(to_tsvector('english', p."body_html"), plainto_tsquery('english', ${q})) AS rank
    FROM "brd_posts" p
    JOIN "brd_threads" t ON t."id" = p."thread_id"
    JOIN "brd_boards" b ON b."id" = t."board_id"
    WHERE p."status" = 'PUBLISHED' AND t."status" = 'PUBLISHED'
      AND t."board_id" = ANY(${visibleBoardIds})
      AND to_tsvector('english', p."body_html") @@ plainto_tsquery('english', ${q})
    ORDER BY rank DESC
    LIMIT ${perPage}
  `

  return NextResponse.json({ threads, posts, page, perPage })
}
