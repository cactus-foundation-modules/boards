'use client'

import { useRouter } from 'next/navigation'

type Props = {
  threadId: string
  isPinned: boolean
  isLocked: boolean
  isArchived: boolean
  isGlobalModerator: boolean
  isGlobalAnnouncement: boolean
}

export default function ThreadModControls({ threadId, isPinned, isLocked, isArchived, isGlobalModerator, isGlobalAnnouncement }: Props) {
  const router = useRouter()

  async function action(path: string) {
    await fetch(`/api/m/boards/admin/threads/${threadId}${path}`, { method: 'POST' })
    router.refresh()
  }
  async function remove() {
    if (!confirm('Delete this thread?')) return
    await fetch(`/api/m/boards/admin/threads/${threadId}`, { method: 'DELETE' })
    router.push('/boards')
  }

  return (
    <div className="card" style={{ padding: '0.75rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Moderator:</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => action('/pin')}>{isPinned ? 'Unpin' : 'Pin'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => action('/lock')}>{isLocked ? 'Unlock' : 'Lock'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => action('/archive')}>{isArchived ? 'Unarchive' : 'Archive'}</button>
      {isGlobalModerator && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => action('/announce')}>{isGlobalAnnouncement ? 'Unannounce' : 'Announce'}</button>
      )}
      <button type="button" className="btn btn-danger btn-sm" onClick={remove}>Delete</button>
    </div>
  )
}
