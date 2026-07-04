import { connection } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getSiteUrlOrNull } from '@/lib/config/env'
import { getThreadBySlug } from '@/modules/boards/lib/db'
import ThreadBody from '@/modules/boards/components/public/ThreadBody'
import ShareButtons from '@/modules/boards/components/public/ShareButtons'
import SubscribeBookmarkButtons from '@/modules/boards/components/public/SubscribeBookmarkButtons'
import { threadBodyPuckComponent, type ThreadBodyProps } from './ThreadBodyBlock'

export async function ThreadBodyBlockRsc(props: ThreadBodyProps) {
  await connection()
  if (!props.threadSlug) return null
  const thread = await getThreadBySlug(props.threadSlug)
  if (!thread) return null

  const user = await getSessionFromCookie()

  const poll = await prisma.$queryRaw<Array<{ id: string; question: string; allow_multiple: boolean; closes_at: Date | null }>>`
    SELECT * FROM "brd_polls" WHERE "thread_id" = ${thread.id} LIMIT 1
  `

  let pollContext = null
  if (poll[0]) {
    const options = await prisma.$queryRaw<Array<{ id: string; label: string; vote_count: bigint }>>`
      SELECT o."id", o."label", COUNT(v."id") AS vote_count
      FROM "brd_poll_options" o LEFT JOIN "brd_poll_votes" v ON v."option_id" = o."id"
      WHERE o."poll_id" = ${poll[0].id} GROUP BY o."id", o."label", o."position" ORDER BY o."position" ASC
    `
    const userVotes = user
      ? await prisma.$queryRaw<Array<{ option_id: string }>>`SELECT "option_id" FROM "brd_poll_votes" WHERE "poll_id" = ${poll[0].id} AND "user_id" = ${user.id}`
      : []
    pollContext = {
      pollId: poll[0].id,
      question: poll[0].question,
      options: options.map((o) => ({ id: o.id, label: o.label, voteCount: Number(o.vote_count) })),
      totalVotes: options.reduce((sum, o) => sum + Number(o.vote_count), 0),
      allowMultiple: poll[0].allow_multiple,
      closesAt: poll[0].closes_at ? poll[0].closes_at.toISOString() : null,
      userVotedOptionIds: userVotes.map((v) => v.option_id),
      canVote: !!user,
    }
  }

  let subscribed = false
  let bookmarked = false
  if (user) {
    const [sub, bm] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "brd_thread_subscriptions" WHERE "thread_id" = ${thread.id} AND "user_id" = ${user.id} LIMIT 1`,
      prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "brd_bookmarks" WHERE "thread_id" = ${thread.id} AND "user_id" = ${user.id} LIMIT 1`,
    ])
    subscribed = !!sub[0]
    bookmarked = !!bm[0]
  }

  const siteUrl = getSiteUrlOrNull() ?? ''

  return (
    <div>
      <ThreadBody openerData={thread.opener_data} pollContext={pollContext} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
        <ShareButtons url={`${siteUrl}/boards/t/${props.threadSlug}`} title={thread.title as string} />
        {user && <SubscribeBookmarkButtons threadId={thread.id as string} initialSubscribed={subscribed} initialBookmarked={bookmarked} />}
      </div>
    </div>
  )
}

export const threadBodyPuckRscComponent = { ...threadBodyPuckComponent, render: ThreadBodyBlockRsc }
