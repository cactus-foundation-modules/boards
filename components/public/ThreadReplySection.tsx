'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ReplyComposer from './ReplyComposer'
import PostItem, { type PostItemData } from './PostItem'

// Kept outside the component so the impure Date.now() call isn't inline in
// render (react-hooks/purity).
function withinEditWindow(createdAt: string, editWindowMinutes: number): boolean {
  return editWindowMinutes === 0 || Date.now() - new Date(createdAt).getTime() < editWindowMinutes * 60_000
}

type Props = {
  threadId: string
  posts: PostItemData[]
  currentUserId: string | null
  isModerator: boolean
  editWindowMinutes: number
  reactionsEnabled: boolean
  reactionSet: string[]
  reactionData: Record<string, { counts: Record<string, number>; active: Record<string, boolean> }>
  canReply: boolean
}

export default function ThreadReplySection({
  threadId, posts, currentUserId, isModerator, editWindowMinutes, reactionsEnabled, reactionSet, reactionData, canReply,
}: Props) {
  const router = useRouter()
  const [replyToPostId, setReplyToPostId] = useState<string | null>(null)
  const [replyToName, setReplyToName] = useState<string | null>(null)

  function handleReply(postId: string, authorName: string) {
    setReplyToPostId(postId)
    setReplyToName(authorName)
    document.getElementById('compose')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function submit(bodySource: unknown) {
    const res = await fetch(`/api/m/boards/public/threads/${threadId}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodySource, replyToPostId }),
    })
    if (res.ok) {
      setReplyToPostId(null)
      setReplyToName(null)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Could not post your reply')
    }
  }

  return (
    <div>
      {posts.map((post) => (
        <PostItem
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          isModerator={isModerator}
          canEdit={withinEditWindow(post.createdAt, editWindowMinutes)}
          reactionsEnabled={reactionsEnabled}
          reactionSet={reactionSet}
          initialCounts={reactionData[post.id]?.counts ?? {}}
          initialActive={reactionData[post.id]?.active ?? {}}
          onReply={handleReply}
        />
      ))}

      {canReply && (
        <div id="compose" className="card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.75rem' }}>Post a reply</h3>
          {replyToName && (
            <div style={{ fontSize: 'var(--text-sm)', marginBottom: '0.5rem' }}>
              Replying to {replyToName} <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setReplyToPostId(null); setReplyToName(null) }}>Cancel</button>
            </div>
          )}
          <ReplyComposer onSubmit={submit} />
        </div>
      )}
    </div>
  )
}
