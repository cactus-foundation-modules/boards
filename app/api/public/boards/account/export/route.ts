import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const [profile, threads, posts, pollVotes, threadSubs, boardSubs, bookmarks, drafts, readState] = await Promise.all([
    prisma.$queryRaw`SELECT * FROM "brd_user_profiles" WHERE "user_id" = ${user.id}`,
    prisma.$queryRaw`SELECT * FROM "brd_threads" WHERE "author_id" = ${user.id}`,
    prisma.$queryRaw`SELECT * FROM "brd_posts" WHERE "author_id" = ${user.id}`,
    prisma.$queryRaw`SELECT * FROM "brd_poll_votes" WHERE "user_id" = ${user.id}`,
    prisma.$queryRaw`SELECT * FROM "brd_thread_subscriptions" WHERE "user_id" = ${user.id}`,
    prisma.$queryRaw`SELECT * FROM "brd_board_subscriptions" WHERE "user_id" = ${user.id}`,
    prisma.$queryRaw`SELECT * FROM "brd_bookmarks" WHERE "user_id" = ${user.id}`,
    prisma.$queryRaw`SELECT * FROM "brd_drafts" WHERE "user_id" = ${user.id}`,
    prisma.$queryRaw`SELECT * FROM "brd_read_state" WHERE "user_id" = ${user.id}`,
  ])

  return NextResponse.json({
    profile, threads, posts, pollVotes, threadSubscriptions: threadSubs, boardSubscriptions: boardSubs, bookmarks, drafts, readState,
  })
}
