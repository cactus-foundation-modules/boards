'use client'

import { useState } from 'react'

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="brd-share">
      <a href={twitterUrl} target="_blank" rel="noopener noreferrer">Share on X</a>
      <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">Share on LinkedIn</a>
      <button type="button" onClick={copyLink}>{copied ? 'Link copied' : 'Copy link'}</button>
    </div>
  )
}
