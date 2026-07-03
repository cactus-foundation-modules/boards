import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess, isGlobalModeratorOrAdmin } from '@/modules/boards/lib/permissions'
import { logModerationAction } from '@/modules/boards/lib/moderation'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!isGlobalModeratorOrAdmin(access)) return errorResponse('Forbidden', 403)

  const { id } = await params
  const [ban] = await prisma.$queryRaw<Array<{ user_id: string }>>`SELECT "user_id" FROM "brd_bans" WHERE "id" = ${id}`
  await prisma.$executeRaw`DELETE FROM "brd_bans" WHERE "id" = ${id}`
  if (ban) {
    await logModerationAction({
      actorId: user.id, actorName: user.displayName ?? user.username, action: 'unban', itemType: 'USER', itemId: ban.user_id,
    })
  }
  return NextResponse.json({ ok: true })
}
