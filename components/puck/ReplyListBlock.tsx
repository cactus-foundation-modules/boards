import { connection } from 'next/server'
import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { getThreadBySlug, getBoardById } from '@/modules/boards/lib/db'
import { getBoardsSettings } from '@/modules/boards/lib/settings'
import ThreadReplySection from '@/modules/boards/components/public/ThreadReplySection'
import type { PostItemData } from '@/modules/boards/components/public/PostItem'

// [ANCHOR] - threadSlug/page/sort are injected by the thread page
// (lib/inject-entry-context.ts). Replies are core content, not decoration.
export type ReplyListProps = { threadSlug?: string; page?: number; sort?: string }

export function ReplyList() {
  return (
    <div style={{ display: 'grid', gap: '0.75rem', opacity: 0.6 }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ height: 80, background: 'var(--color-border)', borderRadius: 8 }} />)}
    </div>
  )
}

export async function ReplyListRsc(props: ReplyListProps) {
  await connection()
  if (!props.threadSlug) return null
  const thread = await getThreadBySlug(props.threadSlug)
  if (!thread) return null

  const user = await getSessionFromCookie()
  const access = user ? await getBoardsAccess(user) : null
  const isModerator = !!access?.canModerate

  const board = await getBoardById(thread.board_id as string)
  const settings = await getBoardsSettings()
  const perPage = settings.postsPerPage
  const page = props.page ?? 1
  const newest = props.sort === 'newest'

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

  const canReply = !!user && thread.status !== 'ARCHIVED' && !thread.is_locked && !board?.is_locked
  const baseUrl = `/boards/t/${props.threadSlug}`

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Replies</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href={`${baseUrl}?sort=oldest`} className={`btn btn-sm ${!newest ? 'btn-primary' : 'btn-ghost'}`}>Oldest first</Link>
          <Link href={`${baseUrl}?sort=newest`} className={`btn btn-sm ${newest ? 'btn-primary' : 'btn-ghost'}`}>Newest first</Link>
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
          {page > 1 && <Link href={`${baseUrl}?page=${page - 1}&sort=${props.sort ?? 'oldest'}`} className="btn btn-ghost btn-sm">Previous</Link>}
          <span style={{ fontSize: 'var(--text-sm)', alignSelf: 'center' }}>Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`${baseUrl}?page=${page + 1}&sort=${props.sort ?? 'oldest'}`} className="btn btn-ghost btn-sm">Next</Link>}
        </div>
      )}
    </div>
  )
}

export const replyListPuckComponent = {
  label: 'Boards: Reply List [Anchor]',
  fields: {},
  defaultProps: {},
  permissions: { delete: false, duplicate: false },
  render: ReplyList,
}

export const replyListPuckRscComponent = { ...replyListPuckComponent, render: ReplyListRsc }
