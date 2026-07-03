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

  const templates = await prisma.$queryRaw`SELECT * FROM "brd_thread_templates" ORDER BY "title" ASC`
  return NextResponse.json({ templates })
}

const CreateBody = z.object({ title: z.string().min(1).max(200), builderData: z.unknown().optional() })

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const parsed = CreateBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  const [template] = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO "brd_thread_templates" ("title", "builder_data")
    VALUES (${parsed.data.title}, ${parsed.data.builderData ? JSON.stringify(parsed.data.builderData) : null}::jsonb)
    RETURNING *
  `
  return NextResponse.json(template, { status: 201 })
}
