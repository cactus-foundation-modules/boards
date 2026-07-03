import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess, withinEditWindow } from '@/modules/boards/lib/permissions'
import { getBoardsSettings } from '@/modules/boards/lib/settings'
import { renderProseHtml } from '@/modules/boards/lib/prose'
import { recomputeThreadCounts } from '@/modules/boards/lib/db'

type Params = { params: Promise<{ id: string }> }

async function getPostWithBoard(id: string) {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT p.*, t."board_id" AS board_id
    FROM "brd_posts" p JOIN "brd_threads" t ON t."id" = p."thread_id"
    WHERE p."id" = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

const PatchBody = z.object({ bodySource: z.unknown() })

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id } = await params
  const post = await getPostWithBoard(id)
  if (!post) return errorResponse('Post not found', 404)

  const access = await getBoardsAccess(user)
  const isModerator = access.canModerate
  const isAuthor = post.author_id === user.id

  if (!isModerator && !isAuthor) return errorResponse('Forbidden', 403)

  if (isAuthor && !isModerator) {
    const settings = await getBoardsSettings()
    if (!withinEditWindow(post.created_at as Date, settings.editWindowMinutes)) {
      return errorResponse('The edit window for this post has passed.', 403)
    }
  }

  const parsed = PatchBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  await prisma.$executeRaw`
    INSERT INTO "brd_post_revisions" ("post_id", "body_html", "body_source", "edited_by")
    VALUES (${id}, ${post.body_html}, ${post.body_source as any}, ${user.id})
  `
  const bodyHtml = renderProseHtml(parsed.data.bodySource as any)
  const [updated] = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE "brd_posts" SET "body_html" = ${bodyHtml}, "body_source" = ${parsed.data.bodySource as any}::jsonb,
      "edited_at" = CURRENT_TIMESTAMP, "edited_by" = ${user.id}, "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = ${id}
    RETURNING *
  `
  return NextResponse.json(updated)
}

// Author self-delete is a soft delete (rendered as "Post removed"); hard
// delete remains moderator-only via the admin route.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id } = await params
  const post = await getPostWithBoard(id)
  if (!post) return errorResponse('Post not found', 404)

  const access = await getBoardsAccess(user)
  const isModerator = access.canModerate
  const isAuthor = post.author_id === user.id
  if (!isModerator && !isAuthor) return errorResponse('Forbidden', 403)

  await prisma.$executeRaw`UPDATE "brd_posts" SET "status" = 'DELETED', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
  await recomputeThreadCounts(post.thread_id as string)
  return NextResponse.json({ ok: true })
}
