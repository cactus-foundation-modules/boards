import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { logModerationAction } from '@/modules/boards/lib/moderation'
import { notifyUser } from '@/modules/boards/lib/notify'

type Params = { params: Promise<{ id: string }> }

const Body = z.object({ action: z.enum(['approve', 'reject']) })

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id } = await params
  const [item] = await prisma.$queryRaw<Array<{ item_type: 'THREAD' | 'POST'; item_id: string }>>`
    SELECT "item_type", "item_id" FROM "brd_moderation_queue" WHERE "id" = ${id} LIMIT 1
  `
  if (!item) return errorResponse('Queue item not found', 404)

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  let boardId: string | null = null
  let authorId: string | null = null
  if (item.item_type === 'THREAD') {
    const [t] = await prisma.$queryRaw<Array<{ board_id: string; author_id: string | null }>>`
      SELECT "board_id", "author_id" FROM "brd_threads" WHERE "id" = ${item.item_id}
    `
    boardId = t?.board_id ?? null
    authorId = t?.author_id ?? null
  } else {
    const [p] = await prisma.$queryRaw<Array<{ board_id: string; author_id: string | null }>>`
      SELECT t."board_id" AS board_id, p."author_id" AS author_id
      FROM "brd_posts" p JOIN "brd_threads" t ON t."id" = p."thread_id"
      WHERE p."id" = ${item.item_id}
    `
    boardId = p?.board_id ?? null
    authorId = p?.author_id ?? null
  }
  if (!boardId) return errorResponse('Item no longer exists', 404)

  const access = await getBoardsAccess(user)
  if (!access.canModerate) return errorResponse('Forbidden', 403)

  const nextStatus = parsed.data.action === 'approve' ? 'PUBLISHED' : 'HIDDEN'
  const table = item.item_type === 'THREAD' ? 'brd_threads' : 'brd_posts'
  await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET "status" = $1, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $2`,
    nextStatus,
    item.item_id
  )
  await prisma.$executeRaw`
    UPDATE "brd_moderation_queue" SET "status" = ${parsed.data.action === 'approve' ? 'APPROVED' : 'REJECTED'},
      "resolved_by" = ${user.id}, "resolved_at" = CURRENT_TIMESTAMP
    WHERE "id" = ${id}
  `
  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: parsed.data.action,
    itemType: item.item_type, itemId: item.item_id,
  })

  if (authorId) {
    await notifyUser({
      userId: authorId,
      title: parsed.data.action === 'approve' ? 'Your post was approved' : 'Your post was rejected by a moderator',
      link: '/boards',
    })
  }

  return NextResponse.json({ ok: true })
}
