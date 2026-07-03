import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess, canModerateBoard, isAnyModerator } from '@/modules/boards/lib/permissions'
import { recomputeThreadCounts } from '@/modules/boards/lib/db'
import { logModerationAction } from '@/modules/boards/lib/moderation'

const Body = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(['hide', 'delete', 'approve', 'reject']),
})

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!isAnyModerator(access)) return errorResponse('Forbidden', 403)

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const { ids, action } = parsed.data

  const posts = await prisma.$queryRaw<Array<{ id: string; thread_id: string; board_id: string }>>`
    SELECT p."id", p."thread_id", t."board_id" AS board_id
    FROM "brd_posts" p JOIN "brd_threads" t ON t."id" = p."thread_id"
    WHERE p."id" = ANY(${ids})
  `
  const byId = new Map(posts.map((p) => [p.id, p]))

  const done: string[] = []
  const skipped: string[] = []
  const touchedThreadIds = new Set<string>()

  for (const id of ids) {
    const post = byId.get(id)
    if (!post || !canModerateBoard(access, post.board_id)) {
      skipped.push(id)
      continue
    }

    switch (action) {
      case 'hide':
        await prisma.$executeRaw`UPDATE "brd_posts" SET "status" = 'HIDDEN', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
        break
      case 'delete':
        await prisma.$executeRaw`UPDATE "brd_posts" SET "status" = 'DELETED', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
        touchedThreadIds.add(post.thread_id)
        break
      case 'approve':
        await prisma.$executeRaw`UPDATE "brd_posts" SET "status" = 'PUBLISHED', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
        await prisma.$executeRaw`UPDATE "brd_moderation_queue" SET "status" = 'APPROVED', "resolved_by" = ${user.id}, "resolved_at" = CURRENT_TIMESTAMP WHERE "item_type" = 'POST' AND "item_id" = ${id} AND "status" = 'OPEN'`
        break
      case 'reject':
        await prisma.$executeRaw`UPDATE "brd_posts" SET "status" = 'HIDDEN', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${id}`
        await prisma.$executeRaw`UPDATE "brd_moderation_queue" SET "status" = 'REJECTED', "resolved_by" = ${user.id}, "resolved_at" = CURRENT_TIMESTAMP WHERE "item_type" = 'POST' AND "item_id" = ${id} AND "status" = 'OPEN'`
        break
    }

    await logModerationAction({
      actorId: user.id, actorName: user.displayName ?? user.username, action, itemType: 'POST', itemId: id, detail: { bulk: true },
    })
    done.push(id)
  }

  await Promise.all(Array.from(touchedThreadIds).map((tid) => recomputeThreadCounts(tid)))

  return NextResponse.json({ done, skipped })
}
