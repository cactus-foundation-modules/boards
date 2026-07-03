import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { logModerationAction } from '@/modules/boards/lib/moderation'

type Params = { params: Promise<{ id: string }> }

const Body = z.object({ action: z.enum(['resolve', 'dismiss']) })

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id } = await params
  const [report] = await prisma.$queryRaw<Array<{ item_type: 'THREAD' | 'POST'; item_id: string }>>`
    SELECT "item_type", "item_id" FROM "brd_reports" WHERE "id" = ${id} LIMIT 1
  `
  if (!report) return errorResponse('Report not found', 404)

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  let boardId: string | null = null
  if (report.item_type === 'THREAD') {
    const [t] = await prisma.$queryRaw<Array<{ board_id: string }>>`SELECT "board_id" FROM "brd_threads" WHERE "id" = ${report.item_id}`
    boardId = t?.board_id ?? null
  } else {
    const [p] = await prisma.$queryRaw<Array<{ board_id: string }>>`
      SELECT t."board_id" AS board_id FROM "brd_posts" p JOIN "brd_threads" t ON t."id" = p."thread_id" WHERE p."id" = ${report.item_id}
    `
    boardId = p?.board_id ?? null
  }
  if (!boardId) return errorResponse('Item no longer exists', 404)

  const access = await getBoardsAccess(user)
  if (!access.canModerate) return errorResponse('Forbidden', 403)

  await prisma.$executeRaw`
    UPDATE "brd_reports" SET "status" = ${parsed.data.action === 'resolve' ? 'RESOLVED' : 'DISMISSED'},
      "resolved_by" = ${user.id}, "resolved_at" = CURRENT_TIMESTAMP
    WHERE "id" = ${id}
  `
  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: `report-${parsed.data.action}`,
    itemType: report.item_type, itemId: report.item_id,
  })
  return NextResponse.json({ ok: true })
}
