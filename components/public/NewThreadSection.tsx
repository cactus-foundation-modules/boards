'use client'

import { useState } from 'react'
import ThreadComposer from './ThreadComposer'

export default function NewThreadSection({ boardId, boardSlug, subBoardId }: { boardId: string; boardSlug: string; subBoardId?: string }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>New Thread</button>
  }

  return (
    <div className="card" style={{ padding: '1.25rem', margin: '1rem 0' }}>
      <ThreadComposer boardId={boardId} boardSlug={boardSlug} subBoardId={subBoardId} />
    </div>
  )
}
