import { connection } from 'next/server'
import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { isBoardVisible } from '@/modules/boards/lib/visibility'
import { getThreadBySlug, getBoardById } from '@/modules/boards/lib/db'
import { getBoardsSettings } from '@/modules/boards/lib/settings'
import ThreadModControls from '@/modules/boards/components/public/ThreadModControls'
import ViewTracker from '@/modules/boards/components/public/ViewTracker'
import ReadTracker from '@/modules/boards/components/public/ReadTracker'

// [ANCHOR] - threadSlug is injected by the thread page (lib/inject-entry-context.ts)
export type ThreadHeaderProps = { threadSlug?: string }

export function ThreadHeader() {
  return (
    <div style={{ opacity: 0.6 }}>
      <div style={{ height: 32, width: '60%', background: 'var(--color-border)', borderRadius: 4, marginBottom: '0.5rem' }} />
      <div style={{ height: 16, width: '40%', background: 'var(--color-border)', borderRadius: 4 }} />
    </div>
  )
}

export async function ThreadHeaderRsc(props: ThreadHeaderProps) {
  await connection()
  if (!props.threadSlug) return null
  const thread = await getThreadBySlug(props.threadSlug)
  if (!thread) return null

  const user = await getSessionFromCookie()
  const access = user ? await getBoardsAccess(user) : null
  const isModerator = !!access?.canModerate

  if (!(await isBoardVisible(thread.board_id as string, !!user, access))) return null
  if ((thread.status === 'PENDING' || thread.status === 'HIDDEN' || thread.status === 'DELETED') && !isModerator) return null

  const [board, settings, tags] = await Promise.all([
    getBoardById(thread.board_id as string),
    getBoardsSettings(),
    prisma.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
      SELECT tg."id", tg."name", tg."slug" FROM "brd_thread_tags" tt JOIN "brd_tags" tg ON tg."id" = tt."tag_id" WHERE tt."thread_id" = ${thread.id}
    `,
  ])

  return (
    <div>
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

      <ViewTracker threadId={thread.id as string} />
      {user && <ReadTracker threadId={thread.id as string} />}
    </div>
  )
}

export const threadHeaderPuckComponent = {
  label: 'Boards: Thread Header [Anchor]',
  fields: {},
  defaultProps: {},
  permissions: { delete: false, duplicate: false },
  render: ThreadHeader,
}

export const threadHeaderPuckRscComponent = { ...threadHeaderPuckComponent, render: ThreadHeaderRsc }
