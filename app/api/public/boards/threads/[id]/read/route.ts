import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id: threadId } = await params
  // Uses the thread's own last_post_at (the newest post visible at this call),
  // not CURRENT_TIMESTAMP - so a reply that lands mid-request doesn't get
  // marked read before the viewer has actually seen it.
  await prisma.$executeRaw`
    INSERT INTO "brd_read_state" ("user_id", "thread_id", "last_read_post_at")
    SELECT ${user.id}, ${threadId}, COALESCE(t."last_post_at", t."created_at") FROM "brd_threads" t WHERE t."id" = ${threadId}
    ON CONFLICT ("user_id", "thread_id") DO UPDATE SET "last_read_post_at" = EXCLUDED."last_read_post_at", "updated_at" = CURRENT_TIMESTAMP
  `
  return NextResponse.json({ ok: true })
}
