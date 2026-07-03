import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { slugifyTitle, ensureUniqueBoardSlug } from '@/modules/boards/lib/slug'

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const boards = await prisma.$queryRaw`
    SELECT * FROM "brd_boards" ORDER BY "category_id" NULLS LAST, "position" ASC
  `
  return NextResponse.json({ boards })
}

const CreateBody = z.object({
  title: z.string().min(1).max(200),
  categoryId: z.string().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  visibility: z.enum(['PUBLIC', 'MEMBERS', 'PRIVATE']).default('PUBLIC'),
  iconEmoji: z.string().max(16).nullable().optional(),
  iconMediaId: z.string().nullable().optional(),
  minPostLength: z.number().int().min(0).nullable().optional(),
  wordFilter: z.array(z.string()).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const parsed = CreateBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const b = parsed.data

  if (['t', 'u'].includes(slugifyTitle(b.title))) return errorResponse('That title is reserved - please choose another')

  const slug = await ensureUniqueBoardSlug(slugifyTitle(b.title))
  const [{ next_position }] = await prisma.$queryRaw<[{ next_position: number }]>`
    SELECT COALESCE(MAX("position") + 1, 0) AS next_position FROM "brd_boards" WHERE "category_id" IS NOT DISTINCT FROM ${b.categoryId ?? null}
  `

  const [board] = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO "brd_boards" (
      "category_id", "title", "slug", "description", "position", "visibility",
      "icon_emoji", "icon_media_id", "min_post_length", "word_filter"
    ) VALUES (
      ${b.categoryId ?? null}, ${b.title}, ${slug}, ${b.description ?? null}, ${next_position}, ${b.visibility},
      ${b.iconEmoji ?? null}, ${b.iconMediaId ?? null}, ${b.minPostLength ?? null},
      ${b.wordFilter ? JSON.stringify(b.wordFilter.map((t) => t.toLowerCase())) : null}::jsonb
    )
    RETURNING *
  `
  return NextResponse.json(board, { status: 201 })
}
