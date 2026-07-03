export type BoardsEmbedProps = { url?: string }

function parseEmbed(url: string): { kind: 'youtube' | 'vimeo'; embedUrl: string } | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v')
      if (id) return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` }
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1)
      if (id) return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` }
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id && /^\d+$/.test(id)) return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` }
    }
  } catch {
    return null
  }
  return null
}

export function BoardsEmbed({ url }: BoardsEmbedProps) {
  if (!url) {
    return <div className="brd-embed-placeholder">Paste a link in the panel</div>
  }

  const embed = parseEmbed(url)
  if (embed) {
    return (
      <div className="brd-embed brd-embed-iframe">
        <iframe
          src={embed.embedUrl}
          title="Embedded video"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  let hostname = url
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    // leave hostname as the raw url if it doesn't parse
  }

  return (
    <a className="brd-embed brd-embed-card" href={url} target="_blank" rel="noopener noreferrer">
      <span className="brd-embed-card-label">{hostname}</span>
      <span className="brd-embed-card-url">{url}</span>
    </a>
  )
}

export const boardsEmbedFieldDef = {
  label: 'Embed',
  fields: {
    url: { type: 'text' as const, label: 'URL' },
  },
  defaultProps: { url: '' },
  render: BoardsEmbed,
}
