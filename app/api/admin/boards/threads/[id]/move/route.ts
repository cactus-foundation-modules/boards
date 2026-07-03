import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { getThreadById } from '@/modules/boards/lib/db'
import { logModerationAction } from '@/modules/boards/lib/moderation'

type Params = { params: Promise<{ id: string }> }

const Body = z.object({ boardId: z.string(), subBoardId: z.string().nullable().optional() })

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id } = await params
  const thread = await getThreadById(id)
  if (!thread) return errorResponse('Thread not found', 404)

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  const access = await getBoardsAccess(user)
  if (!access.canModerate) return errorResponse('Forbidden', 403)

  const [updated] = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE "brd_threads" SET "board_id" = ${parsed.data.boardId}, "sub_board_id" = ${parsed.data.subBoardId ?? null}, "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = ${id} RETURNING *
  `
  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: 'move', itemType: 'THREAD', itemId: id,
    detail: { fromBoardId: thread.board_id, toBoardId: parsed.data.boardId },
  })
  return NextResponse.json(updated)
}
