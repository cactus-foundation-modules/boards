import Link from 'next/link'

export type ThreadRow = {
  id: string
  title: string
  slug: string
  is_pinned: boolean
  is_locked: boolean
  is_global_announcement: boolean
  status: string
  reply_count: number
  view_count: number
  last_post_at: Date | string | null
  created_at: Date | string
  last_read_post_at: Date | string | null
}

export default function ThreadListItem({ thread, showUnread }: { thread: ThreadRow; showUnread: boolean }) {
  const lastActivity = thread.last_post_at ?? thread.created_at
  const unread = showUnread && (!thread.last_read_post_at || new Date(lastActivity).getTime() > new Date(thread.last_read_post_at).getTime())

  return (
    <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
      <div>
        {showUnread && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: unread ? 'var(--color-primary)' : 'transparent', marginRight: '0.5rem' }} />}
        {thread.is_global_announcement && '📢 '}
        {thread.is_pinned && '📌 '}
        <Link href={`/boards/t/${thread.slug}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'var(--color-text)' }}>{thread.title}</Link>
        {thread.is_locked && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>🔒</span>}
        {thread.status === 'ARCHIVED' && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Archived</span>}
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
        {thread.reply_count} repl{thread.reply_count === 1 ? 'y' : 'ies'} · {thread.view_count} views
      </div>
    </div>
  )
}
