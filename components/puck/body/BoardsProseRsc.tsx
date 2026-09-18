import React from 'react'
import type { JSONContent } from '@tiptap/core'
import { renderProseHtml } from '@/modules/boards/lib/prose'
import { sanitizeRichText } from '@/lib/sanitize'
import { BoardsProse, boardsProseFieldDef, type BoardsProseProps } from './BoardsProse'

// Published render of a BoardsProse block. Lives apart from BoardsProse.tsx
// because that file is reachable from the client editor, and core's sanitiser
// lazy-requires jsdom - importing it there would drag jsdom into the browser
// bundle. Same split as core's RichText (config.core.tsx vs config.rsc.tsx).
// The stored TipTap JSON is member-authored, so it is cleaned with the same
// allow-list as core's RichText before it reaches dangerouslySetInnerHTML.
export function BoardsProseRsc(props: BoardsProseProps) {
  const { content } = props
  if (!content || React.isValidElement(content)) return <BoardsProse {...props} />
  const html = sanitizeRichText(renderProseHtml(content as JSONContent))
  return <div className="brd-prose" dangerouslySetInnerHTML={{ __html: html }} />
}

// RSC variant: the richtext field type triggers a client-only hook even inside
// <Render>, so - mirroring Gazette's own treatment - the RSC field def swaps
// to a plain textarea. Fields are never shown for public rendering anyway.
export const boardsProseRscFieldDef = {
  ...boardsProseFieldDef,
  fields: { content: { type: 'textarea' as const, label: 'Content (TipTap JSON)' } },
  render: BoardsProseRsc,
}
