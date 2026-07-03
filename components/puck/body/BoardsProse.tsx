import React from 'react'
import { renderProseHtml } from '@/modules/boards/lib/prose'

export type BoardsProseProps = { content?: unknown; id?: string }

// Shared render for editor canvas + RSC, mirroring GazetteProse. The editor's
// richtext field transforms stored content into a React element for the
// canvas; the RSC path receives raw TipTap JSON and converts it to HTML.
export function BoardsProse(props: BoardsProseProps) {
  const { content } = props
  if (!content) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Write here…</div>
  }
  if (React.isValidElement(content)) {
    return <div className="brd-prose">{content}</div>
  }

  const html = renderProseHtml(content as any)
  return <div className="brd-prose" dangerouslySetInnerHTML={{ __html: html }} />
}

export const boardsProseFieldDef = {
  label: 'Prose',
  fields: {
    content: {
      type: 'richtext' as const,
      label: 'Content',
      options: {
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        textAlign: false,
      },
    },
  },
  defaultProps: { content: undefined },
  render: BoardsProse,
}

// RSC variant: the richtext field type triggers a client-only hook even inside
// <Render>, so - mirroring Gazette's own treatment - the RSC field def swaps
// to a plain textarea. Fields are never shown for public rendering anyway.
export const boardsProseRscFieldDef = {
  ...boardsProseFieldDef,
  fields: { content: { type: 'textarea' as const, label: 'Content (TipTap JSON)' } },
  render: BoardsProse,
}
