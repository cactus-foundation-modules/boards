'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  threadId: string
  isPinned: boolean
  isLocked: boolean
  isArchived: boolean
  isGlobalAnnouncement: boolean
}

export default function ThreadModControls({ threadId, isPinned, isLocked, isArchived, isGlobalAnnouncement }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  // Reports a refused or failed request instead of carrying on as if it
  // worked - a delete that 403'd used to navigate away regardless.
  async function send(url: string, method: string, failure: string): Promise<boolean> {
    setError(null)
    try {
      const res = await fetch(url, { method })
      if (res.ok) return true
      const data = await res.json().catch(() => ({}))
      setError((data as { error?: string }).error ?? failure)
    } catch {
      setError(failure)
    }
    return false
  }

  async function action(path: string) {
    if (await send(`/api/m/boards/admin/threads/${threadId}${path}`, 'POST', 'That did not work - please try again.')) router.refresh()
  }
  async function remove() {
    if (!confirm('Delete this thread?')) return
    if (await send(`/api/m/boards/admin/threads/${threadId}`, 'DELETE', 'Could not delete the thread.')) router.push('/boards')
  }

  return (
    <div className="card" style={{ padding: '0.75rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Moderator:</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => action('/pin')}>{isPinned ? 'Unpin' : 'Pin'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => action('/lock')}>{isLocked ? 'Unlock' : 'Lock'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => action('/archive')}>{isArchived ? 'Unarchive' : 'Archive'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => action('/announce')}>{isGlobalAnnouncement ? 'Unannounce' : 'Announce'}</button>
      <button type="button" className="btn btn-danger btn-sm" onClick={remove}>Delete</button>
      {error && <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: 0, flexBasis: '100%' }}>{error}</p>}
    </div>
  )
}
