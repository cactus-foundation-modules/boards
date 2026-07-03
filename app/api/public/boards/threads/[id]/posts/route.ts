import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getClientIp } from '@/lib/auth/rate-limit'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { isBoardVisible } from '@/modules/boards/lib/visibility'
import { getThreadById, getBoardById, getSubBoardById, getPostById, ensureUserProfile, touchLastSeen, incrementUserPostCount, bumpThreadOnNewPost } from '@/modules/boards/lib/db'
import { getBoardsSettings } from '@/modules/boards/lib/settings'
import { runSubmissionGauntlet } from '@/modules/boards/lib/gauntlet'
import { renderProseHtml, extractProseText } from '@/modules/boards/lib/prose'
import { enqueueModerationItem } from '@/modules/boards/lib/moderation'
import { parseMentionUsernames, resolveMentionedUserIds } from '@/modules/boards/lib/mentions'
import { notifyUser } from '@/modules/boards/lib/notify'

type Params = { params: Promise<{ id: string }> }

const Body = z.object({
  bodySource: z.unknown(),
  replyToPostId: z.string().nullable().optional(),
  'cf-turnstile-response': z.string().optional(),
})

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id: threadId } = await params
  const thread = await getThreadById(threadId)
  if (!thread) return errorResponse('Thread not found', 404)

  const access = await getBoardsAccess(user)
  if (!(await isBoardVisible(thread.board_id as string, true, access))) return errorResponse('Thread not found', 404)

  const board = await getBoardById(thread.board_id as string)
  const subBoard = thread.sub_board_id ? await getSubBoardById(thread.sub_board_id as string) : null

  const parsed = Body.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const b = parsed.data

  let replyToPostId: string | null = null
  if (b.replyToPostId) {
    const quoted = await getPostById(b.replyToPostId)
    if (!quoted || quoted.thread_id !== threadId) return errorResponse('Cannot reply to that post')
    replyToPostId = b.replyToPostId
  }

  const settings = await getBoardsSettings()
  const profile = await ensureUserProfile(user.id, user.displayName ?? user.username)
  const ip = await getClientIp(request)
  const text = extractProseText(b.bodySource as any)

  const gauntlet = await runSubmissionGauntlet({
    userId: user.id,
    accountCreatedAt: user.createdAt,
    ip,
    turnstileToken: b['cf-turnstile-response'],
    settings,
    targetLocked: thread.status === 'ARCHIVED' || !!thread.is_locked || !!board?.is_locked || !!subBoard?.is_locked,
    minPostLength: board?.min_post_length as number | null,
    text,
    wordFilter: board?.word_filter as string[] | null,
    postCount: profile.postCount,
  })
  if (!gauntlet.ok) return errorResponse(gauntlet.error, gauntlet.statusCode)

  const authorName = user.displayName ?? user.username
  const bodyHtml = renderProseHtml(b.bodySource as any)

  const [post] = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO "brd_posts" (
      "thread_id", "author_id", "author_name", "body_html", "body_source", "reply_to_post_id", "status", "ip_address"
    ) VALUES (
      ${threadId}, ${user.id}, ${authorName}, ${bodyHtml}, ${b.bodySource as any}::jsonb, ${replyToPostId}, ${gauntlet.status}, ${ip}
    )
    RETURNING *
  `
  const postId = post!.id as string

  if (gauntlet.status === 'PUBLISHED') {
    await bumpThreadOnNewPost(threadId)
  }
  await incrementUserPostCount(user.id)
  await touchLastSeen(user.id)

  if (gauntlet.status === 'PENDING' && gauntlet.queueReason) {
    await enqueueModerationItem('POST', postId, gauntlet.queueReason)
  }

  if (gauntlet.status === 'PUBLISHED') {
    const slug = thread.slug as string

    if (replyToPostId) {
      const quotedPost = await getPostById(replyToPostId)
      if (quotedPost?.author_id && quotedPost.author_id !== user.id) {
        await notifyUser({ userId: quotedPost.author_id as string, title: `${authorName} quoted your reply`, link: `/boards/t/${slug}#post-${postId}` })
      }
    }

    const mentionUsernames = parseMentionUsernames(text)
    const mentionedIds = await resolveMentionedUserIds(mentionUsernames, user.id)
    for (const mentionedId of mentionedIds) {
      await notifyUser({ userId: mentionedId, title: `${authorName} mentioned you in "${thread.title as string}"`, link: `/boards/t/${slug}#post-${postId}` })
    }

    const subscribers = await prisma.$queryRaw<Array<{ user_id: string }>>`
      SELECT "user_id" FROM "brd_thread_subscriptions" WHERE "thread_id" = ${threadId} AND "user_id" != ${user.id}
    `
    for (const s of subscribers) {
      await notifyUser({ userId: s.user_id, title: `${authorName} replied to "${thread.title as string}"`, link: `/boards/t/${slug}#post-${postId}` })
    }
  }

  return NextResponse.json(post, { status: 201 })
}
