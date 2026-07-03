import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { slugifyTitle, ensureUniqueTagSlug } from '@/modules/boards/lib/slug'

type Params = { params: Promise<{ id: string }> }

const PatchBody = z.object({ name: z.string().min(1).max(50) })

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const { id } = await params
  const parsed = PatchBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  const slug = await ensureUniqueTagSlug(slugifyTitle(parsed.data.name), id)
  const [tag] = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE "brd_tags" SET "name" = ${parsed.data.name}, "slug" = ${slug} WHERE "id" = ${id} RETURNING *
  `
  if (!tag) return errorResponse('Tag not found', 404)
  return NextResponse.json(tag)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const { id } = await params
  const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) FROM "brd_thread_tags" WHERE "tag_id" = ${id}
  `
  if (Number(count) > 0) return NextResponse.json({ count: Number(count) }, { status: 409 })

  await prisma.$executeRaw`DELETE FROM "brd_tags" WHERE "id" = ${id}`
  return NextResponse.json({ ok: true })
}
