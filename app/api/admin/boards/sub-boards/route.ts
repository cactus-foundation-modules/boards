import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { slugifyTitle, ensureUniqueSubBoardSlug } from '@/modules/boards/lib/slug'

export async function GET(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const boardId = request.nextUrl.searchParams.get('boardId')
  const subBoards = boardId
    ? await prisma.$queryRaw`SELECT * FROM "brd_sub_boards" WHERE "board_id" = ${boardId} ORDER BY "position" ASC`
    : await prisma.$queryRaw`SELECT * FROM "brd_sub_boards" ORDER BY "board_id", "position" ASC`
  return NextResponse.json({ subBoards })
}

const CreateBody = z.object({
  boardId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const parsed = CreateBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const b = parsed.data

  const slug = await ensureUniqueSubBoardSlug(b.boardId, slugifyTitle(b.title))
  const [{ next_position }] = await prisma.$queryRaw<[{ next_position: number }]>`
    SELECT COALESCE(MAX("position") + 1, 0) AS next_position FROM "brd_sub_boards" WHERE "board_id" = ${b.boardId}
  `
  const [subBoard] = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO "brd_sub_boards" ("board_id", "title", "slug", "description", "position")
    VALUES (${b.boardId}, ${b.title}, ${slug}, ${b.description ?? null}, ${next_position})
    RETURNING *
  `
  return NextResponse.json(subBoard, { status: 201 })
}
