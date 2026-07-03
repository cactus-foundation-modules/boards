'use client'

import { useState } from 'react'

export default function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (e.g. insecure context) - silently no-op.
    }
  }

  return (
    <button type="button" className="brd-code-copy" onClick={handleCopy} aria-label="Copy code">
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
