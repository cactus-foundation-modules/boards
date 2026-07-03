'use client'

import { useState } from 'react'

export default function Reactions({ postId, reactionSet, initialCounts, initialActive }: {
  postId: string
  reactionSet: string[]
  initialCounts: Record<string, number>
  initialActive: Record<string, boolean>
}) {
  const [counts, setCounts] = useState(initialCounts)
  const [active, setActive] = useState(initialActive)
  const [busy, setBusy] = useState<string | null>(null)

  async function toggle(emoji: string) {
    setBusy(emoji)
    const wasActive = active[emoji] ?? false
    setActive((prev) => ({ ...prev, [emoji]: !wasActive }))
    setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + (wasActive ? -1 : 1) }))

    try {
      const res = await fetch(`/api/m/boards/public/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })
      const data = await res.json()
      if (data?.counts) setCounts(data.counts)
      if (typeof data?.active === 'boolean') setActive((prev) => ({ ...prev, [emoji]: data.active }))
    } catch {
      setActive((prev) => ({ ...prev, [emoji]: wasActive }))
      setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + (wasActive ? 1 : -1) }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="brd-reactions">
      {reactionSet.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="brd-reaction-btn"
          data-active={active[emoji] ? 'true' : 'false'}
          disabled={busy === emoji}
          onClick={() => toggle(emoji)}
        >
          {emoji} {counts[emoji] ?? 0}
        </button>
      ))}
    </div>
  )
}
