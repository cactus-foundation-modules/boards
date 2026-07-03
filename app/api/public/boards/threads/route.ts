import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getClientIp } from '@/lib/auth/rate-limit'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { isBoardVisible } from '@/modules/boards/lib/visibility'
import { getBoardById, getSubBoardById, ensureUserProfile, touchLastSeen, incrementUserPostCount, bumpThreadOnNewPost } from '@/modules/boards/lib/db'
import { ensureUniqueThreadSlug, slugifyTitle } from '@/modules/boards/lib/slug'
import { getBoardsSettings } from '@/modules/boards/lib/settings'
import { runSubmissionGauntlet } from '@/modules/boards/lib/gauntlet'
import { extractOpenerPlainText } from '@/modules/boards/lib/prose'
import { enqueueModerationItem } from '@/modules/boards/lib/moderation'
import { parseMentionUsernames, resolveMentionedUserIds } from '@/modules/boards/lib/mentions'
import { notifyUser } from '@/modules/boards/lib/notify'

const Body = z.object({
  boardId: z.string(),
  subBoardId: z.string().nullable().optional(),
  title: z.string().min(1).max(200),
  openerData: z.unknown(),
  tagIds: z.array(z.string()).optional(),
  poll: z.object({
    question: z.string().min(1).max(300),
    options: z.array(z.string().min(1)).min(2).max(20),
    allowMultiple: z.boolean().default(false),
    closesAt: z.string().datetime().nullable().optional(),
  }).optional(),
  'cf-turnstile-response': z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const parsed = Body.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const b = parsed.data

  const board = await getBoardById(b.boardId)
  if (!board) return errorResponse('Board not found', 404)

  const access = await getBoardsAccess(user)
  if (!(await isBoardVisible(b.boardId, true, access))) return errorResponse('Board not found', 404)

  let subBoard = null
  if (b.subBoardId) {
    subBoard = await getSubBoardById(b.subBoardId)
    if (!subBoard || subBoard.board_id !== b.boardId) return errorResponse('Sub-board not found', 404)
  }

  if (['t', 'u'].includes(slugifyTitle(b.title))) return errorResponse('That title is reserved - please choose another')

  const settings = await getBoardsSettings()
  const profile = await ensureUserProfile(user.id, user.displayName ?? user.username)
  const ip = await getClientIp(request)
  const text = `${b.title} ${extractOpenerPlainText(b.openerData)}`.trim()

  const gauntlet = await runSubmissionGauntlet({
    userId: user.id,
    accountCreatedAt: user.createdAt,
    ip,
    turnstileToken: b['cf-turnstile-response'],
    settings,
    targetLocked: !!board.is_locked || !!subBoard?.is_locked,
    minPostLength: board.min_post_length as number | null,
    text,
    wordFilter: board.word_filter as string[] | null,
    postCount: profile.postCount,
  })
  if (!gauntlet.ok) return errorResponse(gauntlet.error, gauntlet.statusCode)

  const slug = await ensureUniqueThreadSlug(slugifyTitle(b.title))
  const authorName = user.displayName ?? user.username

  const [thread] = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO "brd_threads" (
      "board_id", "sub_board_id", "title", "slug", "author_id", "author_name", "opener_data", "status", "ip_address"
    ) VALUES (
      ${b.boardId}, ${b.subBoardId ?? null}, ${b.title}, ${slug}, ${user.id}, ${authorName},
      ${JSON.stringify(b.openerData)}::jsonb, ${gauntlet.status}, ${ip}
    )
    RETURNING *
  `
  const threadId = thread!.id as string

  if (b.tagIds && b.tagIds.length > 0) {
    await prisma.$transaction(
      b.tagIds.map((tagId) =>
        prisma.$executeRaw`INSERT INTO "brd_thread_tags" ("thread_id", "tag_id") VALUES (${threadId}, ${tagId}) ON CONFLICT DO NOTHING`
      )
    )
  }

  if (b.poll) {
    const [poll] = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "brd_polls" ("thread_id", "question", "allow_multiple", "closes_at")
      VALUES (${threadId}, ${b.poll.question}, ${b.poll.allowMultiple}, ${b.poll.closesAt ? new Date(b.poll.closesAt) : null})
      RETURNING "id"
    `
    await prisma.$transaction(
      b.poll.options.map((label, index) =>
        prisma.$executeRaw`INSERT INTO "brd_poll_options" ("poll_id", "label", "position") VALUES (${poll!.id}, ${label}, ${index})`
      )
    )
  }

  await incrementUserPostCount(user.id)
  await touchLastSeen(user.id)

  if (gauntlet.status === 'PENDING' && gauntlet.queueReason) {
    await enqueueModerationItem('THREAD', threadId, gauntlet.queueReason)
  }

  if (gauntlet.status === 'PUBLISHED') {
    const mentionUsernames = parseMentionUsernames(text)
    const mentionedIds = await resolveMentionedUserIds(mentionUsernames, user.id)
    for (const mentionedId of mentionedIds) {
      await notifyUser({ userId: mentionedId, title: `${authorName} mentioned you in "${b.title}"`, link: `/boards/t/${slug}` })
    }

    const subscribers = await prisma.$queryRaw<Array<{ user_id: string }>>`
      SELECT "user_id" FROM "brd_board_subscriptions" WHERE "board_id" = ${b.boardId} AND "user_id" != ${user.id}
    `
    for (const s of subscribers) {
      await notifyUser({ userId: s.user_id, title: `New thread in ${board.title as string}: ${b.title}`, link: `/boards/t/${slug}` })
    }
  }

  return NextResponse.json(thread, { status: 201 })
}
