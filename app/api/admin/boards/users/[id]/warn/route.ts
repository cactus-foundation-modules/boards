import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess, isAnyModerator } from '@/modules/boards/lib/permissions'
import { logModerationAction } from '@/modules/boards/lib/moderation'
import { notifyUser } from '@/modules/boards/lib/notify'

type Params = { params: Promise<{ id: string }> }

const Body = z.object({ reason: z.string().min(1).max(1000) })

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!isAnyModerator(access)) return errorResponse('Forbidden', 403)

  const { id } = await params
  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: 'warn', itemType: 'USER', itemId: id,
    detail: { reason: parsed.data.reason },
  })

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (target) {
    await notifyUser({ userId: id, title: `You've received a warning: ${parsed.data.reason}`, link: '/boards' })
  }

  return NextResponse.json({ ok: true })
}
