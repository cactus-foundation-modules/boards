import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

type Params = { params: Promise<{ id: string }> }

const PatchBody = z.object({ title: z.string().min(1).max(200) })

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const { id } = await params
  const parsed = PatchBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  const [category] = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE "brd_categories" SET "title" = ${parsed.data.title}, "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = ${id} RETURNING *
  `
  if (!category) return errorResponse('Category not found', 404)
  return NextResponse.json(category)
}

// Deleting a category un-categorises its boards (SET NULL FK), it doesn't cascade delete them.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const { id } = await params
  await prisma.$executeRaw`DELETE FROM "brd_categories" WHERE "id" = ${id}`
  return NextResponse.json({ ok: true })
}
