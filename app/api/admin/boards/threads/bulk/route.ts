import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { logModerationAction } from '@/modules/boards/lib/moderation'

const Body = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(['hide', 'delete', 'lock', 'archive', 'move', 'approve', 'reject']),
  boardId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!access.canModerate) return errorResponse('Forbidden', 403)

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const { ids, action, boardId } = parsed.data
  if (action === 'move' && !boardId) return errorResponse('boardId is required for the move action')

  const threads = await prisma.$queryRaw<Array<{ id: string; board_id: string }>>`
    SELECT "id", "board_id" FROM "brd_threads" WHERE "id" = ANY(${ids})
  `
  const byId = new Map(threads.map((t) => [t.id, t]))

  const done: string[] = []
  const skipped: string[] = []

  for (const id of ids) {
    const thread = byId.get(id)
    if (!thread) {
      skipped.push(id)
      continue
    }

    switch (action) {
      case 'hide':
        await prisma.$executeRaw`UPDATE "brd_threads" SET "status" = 'HIDDEN', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
        break
      case 'delete':
        await prisma.$executeRaw`UPDATE "brd_threads" SET "status" = 'DELETED', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
        break
      case 'lock':
        await prisma.$executeRaw`UPDATE "brd_threads" SET "is_locked" = true, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
        break
      case 'archive':
        await prisma.$executeRaw`UPDATE "brd_threads" SET "status" = 'ARCHIVED', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
        break
      case 'move':
        await prisma.$executeRaw`UPDATE "brd_threads" SET "board_id" = ${boardId}, "sub_board_id" = NULL, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
        break
      case 'approve':
        await prisma.$executeRaw`UPDATE "brd_threads" SET "status" = 'PUBLISHED', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
        await prisma.$executeRaw`UPDATE "brd_moderation_queue" SET "status" = 'APPROVED', "resolved_by" = ${user.id}, "resolved_at" = CURRENT_TIMESTAMP WHERE "item_type" = 'THREAD' AND "item_id" = ${id} AND "status" = 'OPEN'`
        break
      case 'reject':
        await prisma.$executeRaw`UPDATE "brd_threads" SET "status" = 'HIDDEN', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
        await prisma.$executeRaw`UPDATE "brd_moderation_queue" SET "status" = 'REJECTED', "resolved_by" = ${user.id}, "resolved_at" = CURRENT_TIMESTAMP WHERE "item_type" = 'THREAD' AND "item_id" = ${id} AND "status" = 'OPEN'`
        break
    }

    await logModerationAction({
      actorId: user.id, actorName: user.displayName ?? user.username, action, itemType: 'THREAD', itemId: id, detail: { bulk: true },
    })
    done.push(id)
  }

  return NextResponse.json({ done, skipped })
}
