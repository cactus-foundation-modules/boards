import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Render } from '@puckeditor/core/rsc'
import { getSessionFromCookie } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { getSiteUrlOrNull } from '@/lib/config/env'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { isBoardVisible } from '@/modules/boards/lib/visibility'
import { getThreadBySlug, getBoardById } from '@/modules/boards/lib/db'
import { getBoardsSettings } from '@/modules/boards/lib/settings'
import ThreadBody from '@/modules/boards/components/public/ThreadBody'
import ThreadModControls from '@/modules/boards/components/public/ThreadModControls'
import ThreadReplySection from '@/modules/boards/components/public/ThreadReplySection'
import ShareButtons from '@/modules/boards/components/public/ShareButtons'
import SubscribeBookmarkButtons from '@/modules/boards/components/public/SubscribeBookmarkButtons'
import ViewTracker from '@/modules/boards/components/public/ViewTracker'
import ReadTracker from '@/modules/boards/components/public/ReadTracker'
import type { PostItemData } from '@/modules/boards/components/public/PostItem'
import { resolveThemeLayout } from '@/lib/layout/resolveThemeLayout'
import { getModuleLayoutPuckRscConfig } from '@/lib/puck/config.rsc'
import { injectEntryContext } from '@/modules/boards/lib/inject-entry-context'
import type { PuckData } from '@/modules/boards/lib/inject-category-context'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string; sort?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const thread = await getThreadBySlug(slug)
  if (!thread) return {}
  const board = await getBoardById(thread.board_id as string)
  const noindex = board?.visibility !== 'PUBLIC' || !!board?.noindex
  return { title: thread.title as string, ...(noindex ? { robots: { index: false } } : {}) }
}

export default async function ThreadPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { page: pageParam, sort } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const newest = sort === 'newest'

  const thread = await getThreadBySlug(slug)
  if (!thread) notFound()

  const user = await getSessionFromCookie()
  const access = user ? await getBoardsAccess(user) : null
  const isModerator = !!access?.canModerate

  if (!(await isBoardVisible(thread.board_id as string, !!user, access))) notFound()
  if ((thread.status === 'PENDING' || thread.status === 'HIDDEN' || thread.status === 'DELETED') && !isModerator) notFound()

  const layout = await resolveThemeLayout('boardsEntry', { moduleName: 'boards', slug })
  if (layout?.builderData) {
    const boardForSlug = await getBoardById(thread.board_id as string)
    const { page: pageParam2, sort: sort2 } = await searchParams
    const data = injectEntryContext(layout.builderData as PuckData, {
      threadSlug: slug, boardSlug: (boardForSlug?.slug as string) ?? '', page: Math.max(1, parseInt(pageParam2 ?? '1', 10) || 1), sort: sort2,
    })
    return <Render config={getModuleLayoutPuckRscConfig('boardsEntry') as any} data={data as any} />
  }

  const board = await getBoardById(thread.board_id as string)
  const settings = await getBoardsSettings()
  const perPage = settings.postsPerPage

  const [poll, tags] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; question: string; allow_multiple: boolean; closes_at: Date | null }>>`
      SELECT * FROM "brd_polls" WHERE "thread_id" = ${thread.id} LIMIT 1
    `,
    prisma.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
      SELECT tg."id", tg."name", tg."slug" FROM "brd_thread_tags" tt JOIN "brd_tags" tg ON tg."id" = tt."tag_id" WHERE tt."thread_id" = ${thread.id}
    `,
  ])

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

  const visibleStatuses = isModerator ? ['PUBLISHED', 'DELETED', 'PENDING', 'HIDDEN'] : ['PUBLISHED', 'DELETED']
  const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) FROM "brd_posts" WHERE "thread_id" = ${thread.id} AND "status" = ANY(${visibleStatuses})
  `
  const totalPages = Math.max(1, Math.ceil(Number(count) / perPage))

  const postRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT p.*, q."author_name" AS quoted_author_name, q."body_html" AS quoted_body_html
    FROM "brd_posts" p
    LEFT JOIN "brd_posts" q ON q."id" = p."reply_to_post_id"
    WHERE p."thread_id" = ${thread.id} AND p."status" = ANY(${visibleStatuses})
    ORDER BY p."created_at" ${newest ? Prisma.sql`DESC` : Prisma.sql`ASC`}
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `

  const postIds = postRows.map((p) => p.id as string)
  const reactionRows = postIds.length > 0
    ? await prisma.$queryRaw<Array<{ post_id: string; emoji: string; user_id: string }>>`
        SELECT "post_id", "emoji", "user_id" FROM "brd_post_reactions" WHERE "post_id" = ANY(${postIds})
      `
    : []
  const reactionData: Record<string, { counts: Record<string, number>; active: Record<string, boolean> }> = {}
  for (const id of postIds) reactionData[id] = { counts: {}, active: {} }
  for (const r of reactionRows) {
    const bucket = reactionData[r.post_id]!
    bucket.counts[r.emoji] = (bucket.counts[r.emoji] ?? 0) + 1
    if (user && r.user_id === user.id) bucket.active[r.emoji] = true
  }

  const posts: PostItemData[] = postRows.map((p) => ({
    id: p.id as string,
    authorId: p.author_id as string | null,
    authorName: p.author_name as string,
    bodyHtml: p.status === 'DELETED' ? '<p><em>Post removed</em></p>' : (p.body_html as string),
    editedAt: p.edited_at ? (p.edited_at as Date).toISOString() : null,
    createdAt: (p.created_at as Date).toISOString(),
    quotedPostId: (p.reply_to_post_id as string | null) ?? undefined,
    quotedAuthorName: (p.quoted_author_name as string | undefined) ?? undefined,
    quotedSnippet: p.quoted_body_html ? `${String(p.quoted_body_html).replace(/<[^>]+>/g, '').slice(0, 80)}…` : undefined,
  }))

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

  const canReply = !!user && thread.status !== 'ARCHIVED' && !thread.is_locked && !board?.is_locked
  const siteUrl = getSiteUrlOrNull() ?? ''

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <ViewTracker threadId={thread.id as string} />
      {user && <ReadTracker threadId={thread.id as string} />}

      <div style={{ fontSize: 'var(--text-sm)', marginBottom: '0.5rem' }}>
        <Link href={`/boards/${board?.slug}`} style={{ color: 'var(--color-text-muted)' }}>{board?.title as string}</Link>
      </div>

      {isModerator && (
        <ThreadModControls
          threadId={thread.id as string}
          isPinned={thread.is_pinned as boolean}
          isLocked={thread.is_locked as boolean}
          isArchived={thread.status === 'ARCHIVED'}
          isGlobalAnnouncement={thread.is_global_announcement as boolean}
        />
      )}

      <h1>{thread.title as string}</h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
        Started by {thread.author_id ? (thread.author_name as string) : 'Deleted User'} · {new Date(thread.created_at as Date).toLocaleDateString()}
        {settings.showViewCounts && ` · ${thread.view_count} views`}
      </p>

      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {tags.map((t) => <span key={t.id} className="badge">{t.name}</span>)}
        </div>
      )}

      <ThreadBody openerData={thread.opener_data} pollContext={pollContext} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
        <ShareButtons url={`${siteUrl}/boards/t/${slug}`} title={thread.title as string} />
        {user && <SubscribeBookmarkButtons threadId={thread.id as string} initialSubscribed={subscribed} initialBookmarked={bookmarked} />}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Replies</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href={`/boards/t/${slug}?sort=oldest`} className={`btn btn-sm ${!newest ? 'btn-primary' : 'btn-ghost'}`}>Oldest first</Link>
          <Link href={`/boards/t/${slug}?sort=newest`} className={`btn btn-sm ${newest ? 'btn-primary' : 'btn-ghost'}`}>Newest first</Link>
        </div>
      </div>

      <ThreadReplySection
        threadId={thread.id as string}
        posts={posts}
        currentUserId={user?.id ?? null}
        isModerator={isModerator}
        editWindowMinutes={settings.editWindowMinutes}
        reactionsEnabled={settings.reactionsEnabled}
        reactionSet={settings.reactionSet ?? []}
        reactionData={reactionData}
        canReply={canReply}
      />

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          {page > 1 && <Link href={`/boards/t/${slug}?page=${page - 1}&sort=${sort ?? 'oldest'}`} className="btn btn-ghost btn-sm">Previous</Link>}
          <span style={{ fontSize: 'var(--text-sm)', alignSelf: 'center' }}>Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`/boards/t/${slug}?page=${page + 1}&sort=${sort ?? 'oldest'}`} className="btn btn-ghost btn-sm">Next</Link>}
        </div>
      )}
    </div>
  )
}
