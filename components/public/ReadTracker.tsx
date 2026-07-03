'use client'

import { useEffect } from 'react'

export default function ReadTracker({ threadId }: { threadId: string }) {
  useEffect(() => {
    fetch(`/api/m/boards/public/threads/${threadId}/read`, { method: 'POST', keepalive: true }).catch(() => {})
  }, [threadId])

  return null
}
