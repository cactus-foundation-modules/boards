import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { ensureUniqueSubBoardSlug, slugifyTitle } from '@/modules/boards/lib/slug'

type Params = { params: Promise<{ id: string }> }

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  isLocked: z.boolean().optional(),
  position: z.number().int().optional(),
})

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const { id } = await params
  const parsed = PatchBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const b = parsed.data

  let slug: string | undefined
  if (b.title) {
    const [existing] = await prisma.$queryRaw<Array<{ board_id: string }>>`SELECT "board_id" FROM "brd_sub_boards" WHERE "id" = ${id}`
    if (!existing) return errorResponse('Sub-board not found', 404)
    slug = await ensureUniqueSubBoardSlug(existing.board_id, slugifyTitle(b.title), id)
  }

  const [subBoard] = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE "brd_sub_boards" SET
      "title" = COALESCE(${b.title}, "title"),
      "slug" = COALESCE(${slug}, "slug"),
      "description" = CASE WHEN ${b.description !== undefined} THEN ${b.description ?? null} ELSE "description" END,
      "is_locked" = COALESCE(${b.isLocked}, "is_locked"),
      "position" = COALESCE(${b.position}, "position"),
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = ${id}
    RETURNING *
  `
  if (!subBoard) return errorResponse('Sub-board not found', 404)
  return NextResponse.json(subBoard)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const { id } = await params
  await prisma.$executeRaw`DELETE FROM "brd_sub_boards" WHERE "id" = ${id}`
  return NextResponse.json({ ok: true })
}
