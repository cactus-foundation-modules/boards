import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { ensureUniqueBoardSlug, slugifyTitle, RESERVED_BOARD_SLUGS } from '@/modules/boards/lib/slug'

type Params = { params: Promise<{ id: string }> }

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  categoryId: z.string().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  visibility: z.enum(['PUBLIC', 'MEMBERS', 'PRIVATE']).optional(),
  noindex: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  iconEmoji: z.string().max(16).nullable().optional(),
  iconMediaId: z.string().nullable().optional(),
  minPostLength: z.number().int().min(0).nullable().optional(),
  wordFilter: z.array(z.string()).nullable().optional(),
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
    if (RESERVED_BOARD_SLUGS.includes(slugifyTitle(b.title))) return errorResponse('That title is reserved - please choose another')
    slug = await ensureUniqueBoardSlug(slugifyTitle(b.title), id)
  }

  const [board] = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE "brd_boards" SET
      "title" = COALESCE(${b.title}, "title"),
      "slug" = COALESCE(${slug}, "slug"),
      "category_id" = CASE WHEN ${b.categoryId !== undefined} THEN ${b.categoryId ?? null} ELSE "category_id" END,
      "description" = CASE WHEN ${b.description !== undefined} THEN ${b.description ?? null} ELSE "description" END,
      "visibility" = COALESCE(${b.visibility}, "visibility"),
      "noindex" = COALESCE(${b.noindex}, "noindex"),
      "is_locked" = COALESCE(${b.isLocked}, "is_locked"),
      "icon_emoji" = CASE WHEN ${b.iconEmoji !== undefined} THEN ${b.iconEmoji ?? null} ELSE "icon_emoji" END,
      "icon_media_id" = CASE WHEN ${b.iconMediaId !== undefined} THEN ${b.iconMediaId ?? null} ELSE "icon_media_id" END,
      "min_post_length" = CASE WHEN ${b.minPostLength !== undefined} THEN ${b.minPostLength ?? null} ELSE "min_post_length" END,
      "word_filter" = CASE WHEN ${b.wordFilter !== undefined} THEN ${b.wordFilter ? JSON.stringify(b.wordFilter.map((t) => t.toLowerCase())) : null}::jsonb ELSE "word_filter" END,
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = ${id}
    RETURNING *
  `
  if (!board) return errorResponse('Board not found', 404)
  return NextResponse.json(board)
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const { id } = await params
  const confirmed = request.nextUrl.searchParams.get('confirm') === '1'

  if (!confirmed) {
    const [{ threads, posts }] = await prisma.$queryRaw<[{ threads: bigint; posts: bigint }]>`
      SELECT
        (SELECT COUNT(*) FROM "brd_threads" WHERE "board_id" = ${id}) AS threads,
        (SELECT COUNT(*) FROM "brd_posts" p JOIN "brd_threads" t ON t."id" = p."thread_id" WHERE t."board_id" = ${id}) AS posts
    `
    if (Number(threads) > 0 || Number(posts) > 0) {
      return NextResponse.json({ threads: Number(threads), posts: Number(posts) }, { status: 409 })
    }
  }

  await prisma.$executeRaw`DELETE FROM "brd_boards" WHERE "id" = ${id}`
  return NextResponse.json({ ok: true })
}
