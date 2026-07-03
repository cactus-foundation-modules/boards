import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess, canModerateBoard } from '@/modules/boards/lib/permissions'
import { htmlToPostBody } from '@/modules/boards/lib/import/convert'
import { recomputeThreadCounts } from '@/modules/boards/lib/db'
import { logModerationAction } from '@/modules/boards/lib/moderation'

type Params = { params: Promise<{ id: string }> }

async function getPostWithBoard(id: string) {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT p.*, t."board_id" AS board_id
    FROM "brd_posts" p JOIN "brd_threads" t ON t."id" = p."thread_id"
    WHERE p."id" = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

const PatchBody = z.object({
  bodyHtml: z.string().min(1).optional(),
  status: z.enum(['PUBLISHED', 'PENDING', 'HIDDEN', 'DELETED']).optional(),
})

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id } = await params
  const post = await getPostWithBoard(id)
  if (!post) return errorResponse('Post not found', 404)

  const access = await getBoardsAccess(user)
  if (!canModerateBoard(access, post.board_id as string)) return errorResponse('Forbidden', 403)

  const parsed = PatchBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  if (parsed.data.bodyHtml) {
    await prisma.$executeRaw`
      INSERT INTO "brd_post_revisions" ("post_id", "body_html", "body_source", "edited_by")
      VALUES (${id}, ${post.body_html}, ${post.body_source as any}, ${user.id})
    `
    const { bodyHtml, bodySource } = htmlToPostBody(parsed.data.bodyHtml)
    await prisma.$executeRaw`
      UPDATE "brd_posts" SET "body_html" = ${bodyHtml}, "body_source" = ${bodySource as any}::jsonb,
        "edited_at" = CURRENT_TIMESTAMP, "edited_by" = ${user.id}, "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `
  }
  if (parsed.data.status) {
    await prisma.$executeRaw`UPDATE "brd_posts" SET "status" = ${parsed.data.status}, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
  }

  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: 'edit', itemType: 'POST', itemId: id,
  })

  const [updated] = await prisma.$queryRaw<Record<string, unknown>[]>`SELECT * FROM "brd_posts" WHERE "id" = ${id}`
  return NextResponse.json(updated)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id } = await params
  const post = await getPostWithBoard(id)
  if (!post) return errorResponse('Post not found', 404)

  const access = await getBoardsAccess(user)
  if (!canModerateBoard(access, post.board_id as string)) return errorResponse('Forbidden', 403)

  // Moderator delete is a hard delete (author self-delete via the public API is a soft delete).
  await prisma.$executeRaw`DELETE FROM "brd_posts" WHERE "id" = ${id}`
  await recomputeThreadCounts(post.thread_id as string)
  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: 'hard-delete', itemType: 'POST', itemId: id,
  })
  return NextResponse.json({ ok: true })
}
