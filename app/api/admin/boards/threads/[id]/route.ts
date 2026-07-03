import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess, canModerateBoard } from '@/modules/boards/lib/permissions'
import { getThreadById } from '@/modules/boards/lib/db'
import { logModerationAction } from '@/modules/boards/lib/moderation'

type Params = { params: Promise<{ id: string }> }

const PatchBody = z.object({ title: z.string().min(1).max(200) })

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id } = await params
  const thread = await getThreadById(id)
  if (!thread) return errorResponse('Thread not found', 404)

  const access = await getBoardsAccess(user)
  if (!canModerateBoard(access, thread.board_id as string)) return errorResponse('Forbidden', 403)

  const parsed = PatchBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  const [updated] = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE "brd_threads" SET "title" = ${parsed.data.title}, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id} RETURNING *
  `
  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: 'rename', itemType: 'THREAD', itemId: id,
    detail: { title: parsed.data.title },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id } = await params
  const thread = await getThreadById(id)
  if (!thread) return errorResponse('Thread not found', 404)

  const access = await getBoardsAccess(user)
  if (!canModerateBoard(access, thread.board_id as string)) return errorResponse('Forbidden', 403)

  await prisma.$executeRaw`UPDATE "brd_threads" SET "status" = 'DELETED', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: 'delete', itemType: 'THREAD', itemId: id,
  })
  return NextResponse.json({ ok: true })
}
