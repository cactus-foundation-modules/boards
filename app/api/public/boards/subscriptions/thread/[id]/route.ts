import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

type Params = { params: Promise<{ id: string }> }

export async function PUT(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id: threadId } = await params
  await prisma.$executeRaw`
    INSERT INTO "brd_thread_subscriptions" ("thread_id", "user_id") VALUES (${threadId}, ${user.id})
    ON CONFLICT ("thread_id", "user_id") DO NOTHING
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id: threadId } = await params
  await prisma.$executeRaw`DELETE FROM "brd_thread_subscriptions" WHERE "thread_id" = ${threadId} AND "user_id" = ${user.id}`
  return NextResponse.json({ ok: true })
}
