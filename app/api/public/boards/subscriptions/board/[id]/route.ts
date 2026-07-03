import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

type Params = { params: Promise<{ id: string }> }

export async function PUT(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id: boardId } = await params
  await prisma.$executeRaw`
    INSERT INTO "brd_board_subscriptions" ("board_id", "user_id") VALUES (${boardId}, ${user.id})
    ON CONFLICT ("board_id", "user_id") DO NOTHING
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id: boardId } = await params
  await prisma.$executeRaw`DELETE FROM "brd_board_subscriptions" WHERE "board_id" = ${boardId} AND "user_id" = ${user.id}`
  return NextResponse.json({ ok: true })
}
