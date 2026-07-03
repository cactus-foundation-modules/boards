import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

type Params = { params: Promise<{ id: string }> }

const Body = z.object({ visitorToken: z.string().min(1) })

export async function POST(request: NextRequest, { params }: Params) {
  const { id: threadId } = await params
  const parsed = Body.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  const inserted = await prisma.$executeRaw`
    INSERT INTO "brd_thread_views" ("thread_id", "visitor_token") VALUES (${threadId}, ${parsed.data.visitorToken})
    ON CONFLICT ("thread_id", "visitor_token") DO NOTHING
  `
  if (inserted > 0) {
    await prisma.$executeRaw`UPDATE "brd_threads" SET "view_count" = "view_count" + 1 WHERE "id" = ${threadId}`
  }
  return NextResponse.json({ ok: true })
}
