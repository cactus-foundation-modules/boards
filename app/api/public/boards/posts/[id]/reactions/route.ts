import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsSettings } from '@/modules/boards/lib/settings'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { isBoardVisible } from '@/modules/boards/lib/visibility'

type Params = { params: Promise<{ id: string }> }

const Body = z.object({ emoji: z.string().min(1).max(8) })

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id: postId } = await params
  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const { emoji } = parsed.data

  const [post] = await prisma.$queryRaw<Array<{ board_id: string }>>`
    SELECT t."board_id" FROM "brd_posts" p JOIN "brd_threads" t ON t."id" = p."thread_id"
    WHERE p."id" = ${postId} LIMIT 1
  `
  if (!post) return errorResponse('Post not found', 404)
  const access = await getBoardsAccess(user)
  if (!(await isBoardVisible(post.board_id, true, access))) return errorResponse('Post not found', 404)

  const settings = await getBoardsSettings()
  if (!settings.reactionsEnabled) return errorResponse('Reactions are disabled', 403)
  if (!settings.reactionSet?.includes(emoji)) return errorResponse('Invalid reaction')

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "brd_post_reactions" WHERE "post_id" = ${postId} AND "user_id" = ${user.id} AND "emoji" = ${emoji} LIMIT 1
  `
  let active: boolean
  if (existing[0]) {
    await prisma.$executeRaw`DELETE FROM "brd_post_reactions" WHERE "id" = ${existing[0].id}`
    active = false
  } else {
    await prisma.$executeRaw`INSERT INTO "brd_post_reactions" ("post_id", "user_id", "emoji") VALUES (${postId}, ${user.id}, ${emoji})`
    active = true
  }

  const counts = await prisma.$queryRaw<Array<{ emoji: string; count: bigint }>>`
    SELECT "emoji", COUNT(*) AS count FROM "brd_post_reactions" WHERE "post_id" = ${postId} GROUP BY "emoji"
  `
  const countsMap = Object.fromEntries(counts.map((c) => [c.emoji, Number(c.count)]))
  return NextResponse.json({ active, counts: countsMap })
}
