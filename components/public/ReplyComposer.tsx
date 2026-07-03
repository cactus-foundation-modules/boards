'use client'

import { useState } from 'react'
import { Puck } from '@puckeditor/core'
import type { Data } from '@puckeditor/core'
import '@puckeditor/core/no-external.css'
import { boardsProseFieldDef } from '@/modules/boards/components/puck/body/BoardsProse'

// Standalone richtext composer for replies (BOARDS_SPEC section 7) - reuses
// the same richtext field the BoardsProse body block wraps, via a minimal
// single-component Puck config, rather than a full page-builder canvas.
const replyConfig = {
  categories: { reply: { title: 'Reply', components: ['ReplyBody'], defaultExpanded: true } },
  components: { ReplyBody: boardsProseFieldDef },
}

const EMPTY_DATA: Data = {
  root: { props: {} },
  content: [{ type: 'ReplyBody', props: { id: 'ReplyBody-1', content: undefined } }],
  zones: {},
}

type Props = {
  onSubmit: (bodySource: unknown) => Promise<void>
  submitLabel?: string
  placeholder?: string
}

export default function ReplyComposer({ onSubmit, submitLabel = 'Post reply' }: Props) {
  const [data, setData] = useState<Data>(EMPTY_DATA)
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    const block = data.content[0] as { props?: { content?: unknown } } | undefined
    const content = block?.props?.content
    if (!content) return
    setBusy(true)
    try {
      await onSubmit(content)
      setData(EMPTY_DATA)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="brd-reply-composer">
      <div style={{ minHeight: 180, border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
        <Puck config={replyConfig as any} data={data} onChange={setData} iframe={{ enabled: false }} />
      </div>
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} disabled={busy} onClick={handleSubmit}>
        {busy ? 'Posting…' : submitLabel}
      </button>
    </div>
  )
}
