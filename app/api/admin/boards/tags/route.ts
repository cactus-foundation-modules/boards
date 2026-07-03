import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { slugifyTitle, ensureUniqueTagSlug } from '@/modules/boards/lib/slug'

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const tags = await prisma.$queryRaw`SELECT * FROM "brd_tags" ORDER BY "name" ASC`
  return NextResponse.json({ tags })
}

const CreateBody = z.object({ name: z.string().min(1).max(50) })

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const parsed = CreateBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  const slug = await ensureUniqueTagSlug(slugifyTitle(parsed.data.name))
  const [tag] = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO "brd_tags" ("name", "slug") VALUES (${parsed.data.name}, ${slug}) RETURNING *
  `
  return NextResponse.json(tag, { status: 201 })
}
