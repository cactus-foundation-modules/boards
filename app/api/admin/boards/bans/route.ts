import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess, isGlobalModeratorOrAdmin } from '@/modules/boards/lib/permissions'
import { logModerationAction } from '@/modules/boards/lib/moderation'

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!isGlobalModeratorOrAdmin(access)) return errorResponse('Forbidden', 403)

  const bans = await prisma.$queryRaw`
    SELECT b.*, u."username", u."displayName" FROM "brd_bans" b JOIN "User" u ON u."id" = b."user_id"
    ORDER BY b."created_at" DESC
  `
  return NextResponse.json({ bans })
}

const CreateBody = z.object({ userId: z.string(), reason: z.string().max(1000).optional(), expiresAt: z.string().datetime().optional() })

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!isGlobalModeratorOrAdmin(access)) return errorResponse('Forbidden', 403)

  const parsed = CreateBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const b = parsed.data

  const [ban] = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO "brd_bans" ("user_id", "reason", "expires_at", "created_by")
    VALUES (${b.userId}, ${b.reason ?? null}, ${b.expiresAt ? new Date(b.expiresAt) : null}, ${user.id})
    RETURNING *
  `
  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: 'ban', itemType: 'USER', itemId: b.userId,
    detail: { reason: b.reason },
  })
  return NextResponse.json(ban, { status: 201 })
}
