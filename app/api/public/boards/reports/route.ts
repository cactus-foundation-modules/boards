import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { isBoardVisible } from '@/modules/boards/lib/visibility'

const Body = z.object({
  itemType: z.enum(['THREAD', 'POST']),
  itemId: z.string(),
  reason: z.string().min(1).max(1000),
})

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const { itemType, itemId, reason } = parsed.data

  // The reported item must actually exist and be visible to the reporter,
  // otherwise the mod queue can be flooded with reports for bogus / hidden ids.
  // Mirror the thread-page gate: non-moderators can't see PENDING/HIDDEN/DELETED
  // threads, nor PENDING/HIDDEN posts.
  const access = await getBoardsAccess(user)
  const isMod = !!access?.canModerate
  const [item] = itemType === 'THREAD'
    ? await prisma.$queryRaw<Array<{ board_id: string; status: string }>>`
        SELECT "board_id", "status" FROM "brd_threads" WHERE "id" = ${itemId} LIMIT 1
      `
    : await prisma.$queryRaw<Array<{ board_id: string; status: string }>>`
        SELECT t."board_id", p."status" FROM "brd_posts" p JOIN "brd_threads" t ON t."id" = p."thread_id"
        WHERE p."id" = ${itemId} LIMIT 1
      `
  if (!item) return errorResponse('Item not found', 404)
  if (!(await isBoardVisible(item.board_id, true, access))) return errorResponse('Item not found', 404)
  const hiddenForThread = ['PENDING', 'HIDDEN', 'DELETED']
  const hiddenForPost = ['PENDING', 'HIDDEN']
  const hidden = itemType === 'THREAD' ? hiddenForThread : hiddenForPost
  if (hidden.includes(item.status) && !isMod) return errorResponse('Item not found', 404)

  const windowStart = new Date(Date.now() - 60 * 60 * 1000)
  const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) FROM "brd_reports" WHERE "reporter_id" = ${user.id} AND "created_at" > ${windowStart}
  `
  if (Number(count) >= 20) return errorResponse('Too many reports - please try again later', 429)

  await prisma.$executeRaw`
    INSERT INTO "brd_reports" ("item_type", "item_id", "reporter_id", "reason")
    VALUES (${itemType}, ${itemId}, ${user.id}, ${reason})
  `
  return NextResponse.json({ ok: true }, { status: 201 })
}
