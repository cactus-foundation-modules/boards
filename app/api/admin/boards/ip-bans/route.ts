import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { logModerationAction } from '@/modules/boards/lib/moderation'

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!access.canModerate) return errorResponse('Forbidden', 403)

  const ipBans = await prisma.$queryRaw`SELECT * FROM "brd_ip_bans" ORDER BY "created_at" DESC`
  return NextResponse.json({ ipBans })
}

const CreateBody = z.object({ ipAddress: z.string().min(1).max(64), reason: z.string().max(1000).optional(), expiresAt: z.string().datetime().optional() })

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!access.canModerate) return errorResponse('Forbidden', 403)

  const parsed = CreateBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const b = parsed.data

  const [ipBan] = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO "brd_ip_bans" ("ip_address", "reason", "expires_at", "created_by")
    VALUES (${b.ipAddress}, ${b.reason ?? null}, ${b.expiresAt ? new Date(b.expiresAt) : null}, ${user.id})
    ON CONFLICT ("ip_address") DO UPDATE SET "reason" = ${b.reason ?? null}, "expires_at" = ${b.expiresAt ? new Date(b.expiresAt) : null}
    RETURNING *
  `
  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: 'ip-ban', itemType: undefined, itemId: undefined,
    detail: { ipAddress: b.ipAddress, reason: b.reason },
  })
  return NextResponse.json(ipBan, { status: 201 })
}
