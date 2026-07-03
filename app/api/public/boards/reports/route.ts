import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

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
