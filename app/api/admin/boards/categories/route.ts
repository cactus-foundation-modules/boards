import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const categories = await prisma.$queryRaw`
    SELECT * FROM "brd_categories" ORDER BY "position" ASC
  `
  return NextResponse.json({ categories })
}

const CreateBody = z.object({ title: z.string().min(1).max(200) })

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const parsed = CreateBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  const [{ next_position }] = await prisma.$queryRaw<[{ next_position: number }]>`
    SELECT COALESCE(MAX("position") + 1, 0) AS next_position FROM "brd_categories"
  `
  const [category] = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO "brd_categories" ("title", "position") VALUES (${parsed.data.title}, ${next_position})
    RETURNING *
  `
  return NextResponse.json(category, { status: 201 })
}
