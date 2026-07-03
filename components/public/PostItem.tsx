'use client'

import { useState } from 'react'
import Reactions from './Reactions'

export type PostItemData = {
  id: string
  authorId: string | null
  authorName: string
  bodyHtml: string
  editedAt: string | null
  createdAt: string
  quotedAuthorName?: string
  quotedSnippet?: string
  quotedPostId?: string | null
}

type Props = {
  post: PostItemData
  currentUserId: string | null
  isModerator: boolean
  canEdit: boolean
  reactionsEnabled: boolean
  reactionSet: string[]
  initialCounts: Record<string, number>
  initialActive: Record<string, boolean>
  onReply: (postId: string, authorName: string) => void
}

export default function PostItem({ post, currentUserId, isModerator, canEdit, reactionsEnabled, reactionSet, initialCounts, initialActive, onReply }: Props) {
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)

  const isOwn = currentUserId === post.authorId

  async function moderate(action: 'hide' | 'delete') {
    setBusy(true)
    await fetch(`/api/m/boards/admin/posts/${post.id}`, {
      method: action === 'hide' ? 'PATCH' : 'DELETE',
      headers: action === 'hide' ? { 'Content-Type': 'application/json' } : undefined,
      body: action === 'hide' ? JSON.stringify({ status: 'HIDDEN' }) : undefined,
    })
    setHidden(true)
    setBusy(false)
  }

  async function selfDelete() {
    setBusy(true)
    await fetch(`/api/m/boards/public/posts/${post.id}`, { method: 'DELETE' })
    setHidden(true)
    setBusy(false)
  }

  async function report() {
    const reason = prompt('Why are you reporting this post?')
    if (!reason) return
    await fetch('/api/m/boards/public/reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType: 'POST', itemId: post.id, reason }),
    })
    alert('Thanks - a moderator will take a look.')
  }

  if (hidden) return null

  return (
    <div id={`post-${post.id}`} className="card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
        <span>
          {post.authorId ? post.authorName : 'Deleted User'}
          {post.editedAt && <em> (edited)</em>}
        </span>
        <span>{new Date(post.createdAt).toLocaleString()}</span>
      </div>

      {post.quotedPostId && (
        <a href={`#post-${post.quotedPostId}`} style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', borderLeft: '3px solid var(--color-border)', paddingLeft: '0.625rem', marginBottom: '0.5rem', textDecoration: 'none' }}>
          Replying to {post.quotedAuthorName}: {post.quotedSnippet}
        </a>
      )}

      <div className="brd-prose" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

      {reactionsEnabled && currentUserId && (
        <Reactions postId={post.id} reactionSet={reactionSet} initialCounts={initialCounts} initialActive={initialActive} />
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: 'var(--text-sm)' }}>
        {currentUserId && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onReply(post.id, post.authorName)}>Quote</button>}
        {currentUserId && <button type="button" className="btn btn-ghost btn-sm" onClick={report}>Report</button>}
        {isOwn && canEdit && <a href={`#compose`} className="btn btn-ghost btn-sm">Edit</a>}
        {isOwn && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={selfDelete}>Delete</button>}
        {isModerator && !isOwn && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => moderate('hide')}>Hide</button>}
        {isModerator && <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => moderate('delete')}>Delete (mod)</button>}
      </div>
    </div>
  )
}
