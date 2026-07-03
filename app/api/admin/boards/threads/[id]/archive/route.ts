import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess, canModerateBoard } from '@/modules/boards/lib/permissions'
import { getThreadById } from '@/modules/boards/lib/db'
import { logModerationAction } from '@/modules/boards/lib/moderation'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id } = await params
  const thread = await getThreadById(id)
  if (!thread) return errorResponse('Thread not found', 404)

  const access = await getBoardsAccess(user)
  if (!canModerateBoard(access, thread.board_id as string)) return errorResponse('Forbidden', 403)

  const archiving = thread.status !== 'ARCHIVED'
  const nextStatus = archiving ? 'ARCHIVED' : 'PUBLISHED'

  const [updated] = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE "brd_threads" SET "status" = ${nextStatus}, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id} RETURNING *
  `
  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: archiving ? 'archive' : 'unarchive', itemType: 'THREAD', itemId: id,
  })
  return NextResponse.json(updated)
}
