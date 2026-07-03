import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const sp = request.nextUrl.searchParams
  const threadId = sp.get('threadId')
  const boardId = sp.get('boardId')

  if (threadId) {
    const drafts = await prisma.$queryRaw`
      SELECT * FROM "brd_drafts" WHERE "user_id" = ${user.id} AND "thread_id" = ${threadId} LIMIT 1
    `
    return NextResponse.json({ drafts })
  }
  if (boardId) {
    const drafts = await prisma.$queryRaw`
      SELECT * FROM "brd_drafts" WHERE "user_id" = ${user.id} AND "board_id" = ${boardId} AND "thread_id" IS NULL
      ORDER BY "updated_at" DESC
    `
    return NextResponse.json({ drafts })
  }
  const drafts = await prisma.$queryRaw`
    SELECT * FROM "brd_drafts" WHERE "user_id" = ${user.id} ORDER BY "updated_at" DESC
  `
  return NextResponse.json({ drafts })
}

const Body = z.object({
  id: z.string().optional(),
  threadId: z.string().nullable().optional(),
  boardId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  openerData: z.unknown().optional(),
  bodySource: z.unknown().optional(),
})

export async function PUT(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const d = parsed.data

  if (d.threadId) {
    const [draft] = await prisma.$queryRaw<Record<string, unknown>[]>`
      INSERT INTO "brd_drafts" ("user_id", "thread_id", "body_source", "updated_at")
      VALUES (${user.id}, ${d.threadId}, ${d.bodySource as any}::jsonb, CURRENT_TIMESTAMP)
      ON CONFLICT ("user_id", "thread_id") WHERE "thread_id" IS NOT NULL
      DO UPDATE SET "body_source" = ${d.bodySource as any}::jsonb, "updated_at" = CURRENT_TIMESTAMP
      RETURNING *
    `
    return NextResponse.json(draft)
  }

  if (d.id) {
    const [draft] = await prisma.$queryRaw<Record<string, unknown>[]>`
      UPDATE "brd_drafts" SET
        "title" = COALESCE(${d.title}, "title"),
        "opener_data" = CASE WHEN ${d.openerData !== undefined} THEN ${d.openerData ? JSON.stringify(d.openerData) : null}::jsonb ELSE "opener_data" END,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${d.id} AND "user_id" = ${user.id}
      RETURNING *
    `
    if (!draft) return errorResponse('Draft not found', 404)
    return NextResponse.json(draft)
  }

  const [draft] = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO "brd_drafts" ("user_id", "board_id", "title", "opener_data")
    VALUES (${user.id}, ${d.boardId ?? null}, ${d.title ?? null}, ${d.openerData ? JSON.stringify(d.openerData) : null}::jsonb)
    RETURNING *
  `
  return NextResponse.json(draft, { status: 201 })
}
