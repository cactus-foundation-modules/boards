import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getClientIp } from '@/lib/auth/rate-limit'
import { allowRequest } from '@/modules/boards/lib/memory-rate-limit'

type Params = { params: Promise<{ id: string }> }

// The browser sends a UUID; anything much longer is not from the browser.
const Body = z.object({ visitorToken: z.string().min(1).max(64) })

export async function POST(request: NextRequest, { params }: Params) {
  if (!allowRequest(`brd_view:${await getClientIp()}`, 60, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 })
  }
  const { id: threadId } = await params
  const parsed = Body.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  const inserted = await prisma.$executeRaw`
    INSERT INTO "brd_thread_views" ("thread_id", "visitor_token")
    SELECT ${threadId}, ${parsed.data.visitorToken}
    WHERE EXISTS (SELECT 1 FROM "brd_threads" WHERE "id" = ${threadId} AND "status" IN ('PUBLISHED', 'ARCHIVED'))
    ON CONFLICT ("thread_id", "visitor_token") DO NOTHING
  `
  if (inserted > 0) {
    await prisma.$executeRaw`UPDATE "brd_threads" SET "view_count" = "view_count" + 1 WHERE "id" = ${threadId}`
  }
  return NextResponse.json({ ok: true })
}
