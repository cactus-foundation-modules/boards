import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess, canModerateBoard } from '@/modules/boards/lib/permissions'
import { getThreadById, getPostById, recomputeThreadCounts } from '@/modules/boards/lib/db'
import { ensureUniqueThreadSlug, slugifyTitle } from '@/modules/boards/lib/slug'
import { logModerationAction } from '@/modules/boards/lib/moderation'

type Params = { params: Promise<{ id: string }> }

const Body = z.object({ fromPostId: z.string(), title: z.string().min(1).max(200), boardId: z.string().optional() })

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id } = await params
  const thread = await getThreadById(id)
  if (!thread) return errorResponse('Thread not found', 404)

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const { fromPostId, title } = parsed.data
  const targetBoardId = parsed.data.boardId ?? (thread.board_id as string)

  const access = await getBoardsAccess(user)
  if (!canModerateBoard(access, thread.board_id as string) || !canModerateBoard(access, targetBoardId)) {
    return errorResponse('Forbidden', 403)
  }

  const fromPost = await getPostById(fromPostId)
  if (!fromPost || fromPost.thread_id !== id) return errorResponse('Post not found in this thread', 404)

  const slug = await ensureUniqueThreadSlug(slugifyTitle(title))

  const [newThread] = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO "brd_threads" ("board_id", "title", "slug", "author_id", "author_name", "opener_data", "status")
    VALUES (${targetBoardId}, ${title}, ${slug}, ${fromPost.author_id}, ${fromPost.author_name}, NULL, 'PUBLISHED')
    RETURNING *
  `
  const newThreadId = newThread!.id as string

  await prisma.$executeRaw`
    UPDATE "brd_posts" SET "thread_id" = ${newThreadId}
    WHERE "thread_id" = ${id} AND "created_at" >= ${fromPost.created_at as Date}
  `

  await Promise.all([recomputeThreadCounts(id), recomputeThreadCounts(newThreadId)])

  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: 'split', itemType: 'THREAD', itemId: id,
    detail: { newThreadId, fromPostId },
  })
  await logModerationAction({
    actorId: user.id, actorName: user.displayName ?? user.username, action: 'split-created', itemType: 'THREAD', itemId: newThreadId,
    detail: { sourceThreadId: id, fromPostId },
  })

  return NextResponse.json(newThread, { status: 201 })
}
