import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { isAdmin } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

type Params = { params: Promise<{ userId: string }> }

const Body = z.object({ boardId: z.string().nullable() })

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!isAdmin(user)) return errorResponse('Forbidden', 403)

  const { userId } = await params
  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  // Two separate ON CONFLICT targets: the plain (user_id, board_id) unique
  // constraint never fires for NULL board_id (Postgres treats NULLs as
  // distinct), so the global-moderator case relies on the partial unique
  // index on (user_id) WHERE board_id IS NULL instead - see migration.
  if (parsed.data.boardId === null) {
    await prisma.$executeRaw`
      INSERT INTO "brd_moderator_assignments" ("user_id", "board_id", "assigned_by")
      VALUES (${userId}, NULL, ${user.id})
      ON CONFLICT ("user_id") WHERE "board_id" IS NULL DO NOTHING
    `
  } else {
    await prisma.$executeRaw`
      INSERT INTO "brd_moderator_assignments" ("user_id", "board_id", "assigned_by")
      VALUES (${userId}, ${parsed.data.boardId}, ${user.id})
      ON CONFLICT ("user_id", "board_id") DO NOTHING
    `
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!isAdmin(user)) return errorResponse('Forbidden', 403)

  const { userId } = await params
  const boardId = request.nextUrl.searchParams.get('boardId')

  if (boardId) {
    await prisma.$executeRaw`DELETE FROM "brd_moderator_assignments" WHERE "user_id" = ${userId} AND "board_id" = ${boardId}`
  } else {
    await prisma.$executeRaw`DELETE FROM "brd_moderator_assignments" WHERE "user_id" = ${userId} AND "board_id" IS NULL`
  }
  return NextResponse.json({ ok: true })
}
