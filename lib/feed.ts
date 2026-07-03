import type { BoardsSettings } from './types'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export type FeedThread = { title: string; slug: string; authorName: string | null; createdAt: Date }

export function buildRssXml(opts: {
  siteUrl: string
  channelUrl: string
  settings: BoardsSettings
  defaultTitle: string
  threads: FeedThread[]
}): string {
  const { siteUrl, channelUrl, settings, defaultTitle, threads } = opts
  const channelTitle = settings.feedTitle ?? defaultTitle
  const channelDescription = settings.feedDescription ?? ''
  const selfUrl = `${channelUrl}/feed.xml`

  const items = threads.map((t) => `
    <item>
      <title>${escapeXml(t.title)}</title>
      <link>${escapeXml(`${siteUrl}/boards/t/${t.slug}`)}</link>
      <guid isPermaLink="true">${escapeXml(`${siteUrl}/boards/t/${t.slug}`)}</guid>
      <pubDate>${t.createdAt.toUTCString()}</pubDate>
      ${t.authorName ? `<dc:creator>${escapeXml(t.authorName)}</dc:creator>` : ''}
    </item>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelUrl)}</link>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(channelDescription)}</description>${items}
  </channel>
</rss>`
}
