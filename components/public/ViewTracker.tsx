'use client'

import { useEffect } from 'react'
import { getOrCreateVisitorToken } from '@/modules/boards/lib/visitor'

export default function ViewTracker({ threadId }: { threadId: string }) {
  useEffect(() => {
    const visitorToken = getOrCreateVisitorToken()
    fetch(`/api/m/boards/public/threads/${threadId}/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorToken }),
      keepalive: true,
    }).catch(() => {})

  }, [threadId])

  return null
}
