import { generateHTML } from '@tiptap/html'
import type { JSONContent } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { Bold } from '@tiptap/extension-bold'
import { Italic } from '@tiptap/extension-italic'
import { Heading } from '@tiptap/extension-heading'
import { Blockquote } from '@tiptap/extension-blockquote'
import { HardBreak } from '@tiptap/extension-hard-break'
import { Link } from '@tiptap/extension-link'
import { BulletList, OrderedList, ListItem } from '@tiptap/extension-list'

// Shared richtext extension set for the BoardsProse body block AND the
// standalone reply composer (BOARDS_SPEC section 7 - "the same richtext field
// component the Prose block wraps"). Same restricted schema as Gazette's
// GazetteProse: headings 2-4, no image node (see BOARDS_SPEC 7 / protected
// item 2 - no new @tiptap/* dependency needed, this is already a transitive
// dependency of @puckeditor/core's built-in richtext field).
export const proseExtensions = [
  Document, Paragraph, Text, Bold, Italic,
  Heading.configure({ levels: [2, 3, 4] }),
  Blockquote, HardBreak, Link,
  BulletList, OrderedList, ListItem,
]

export function renderProseHtml(json: JSONContent): string {
  if (!json) return ''
  try {
    return generateHTML(json, proseExtensions)
  } catch {
    return ''
  }
}

export function extractProseText(json: JSONContent | null | undefined): string {
  if (!json) return ''
  let text = ''
  if (json.type === 'text' && typeof json.text === 'string') text += json.text
  if (Array.isArray(json.content)) {
    for (const child of json.content) text += (text ? ' ' : '') + extractProseText(child)
  }
  return text.trim()
}

type PuckBlock = { type?: string; props?: Record<string, unknown> }
type PuckData = { content?: PuckBlock[] }

// Walks a thread opener's Puck Data to approximate its plain-text content, for
// min-post-length and word-filter checks - the opener can mix several block
// types, so this isn't a full renderer, just enough text to gate on.
export function extractOpenerPlainText(openerData: unknown): string {
  const data = openerData as PuckData | null | undefined
  if (!data?.content || !Array.isArray(data.content)) return ''

  const parts: string[] = []
  for (const block of data.content) {
    const props = block.props ?? {}
    switch (block.type) {
      case 'BoardsProse':
        parts.push(extractProseText(props.content as JSONContent))
        break
      case 'BoardsPullQuote':
        parts.push([props.quote, props.attribution].filter(Boolean).join(' '))
        break
      case 'BoardsCode':
        parts.push(String(props.code ?? ''))
        break
      case 'BoardsPoll':
        parts.push(String(props.question ?? ''))
        break
      default:
        break
    }
  }
  return parts.filter(Boolean).join(' ').trim()
}
