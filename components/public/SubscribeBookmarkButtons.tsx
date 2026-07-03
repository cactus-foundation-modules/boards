'use client'

import { useState } from 'react'

export default function SubscribeBookmarkButtons({ threadId, initialSubscribed, initialBookmarked }: {
  threadId: string
  initialSubscribed: boolean
  initialBookmarked: boolean
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [bookmarked, setBookmarked] = useState(initialBookmarked)

  async function toggleSubscribe() {
    const next = !subscribed
    setSubscribed(next)
    await fetch(`/api/m/boards/public/subscriptions/thread/${threadId}`, { method: next ? 'PUT' : 'DELETE' })
  }
  async function toggleBookmark() {
    const next = !bookmarked
    setBookmarked(next)
    await fetch(`/api/m/boards/public/bookmarks/thread/${threadId}`, { method: next ? 'PUT' : 'DELETE' })
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={toggleSubscribe}>{subscribed ? 'Unsubscribe' : 'Subscribe'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={toggleBookmark}>{bookmarked ? 'Remove bookmark' : 'Bookmark'}</button>
    </div>
  )
}
