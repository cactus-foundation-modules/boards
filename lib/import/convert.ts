import { generateJSON } from '@tiptap/html'
import { proseExtensions, renderProseHtml } from '@/modules/boards/lib/prose'

// Thread openers are imported as a single BoardsProse block; posts (replies)
// don't use Puck at all (BOARDS_SPEC 7), so they get the raw {bodyHtml, bodySource} pair.

export function htmlToOpenerData(html: string): unknown {
  const json = generateJSON(html, proseExtensions)
  return {
    root: { props: {} },
    content: [{ type: 'BoardsProse', props: { id: 'BoardsProse-' + crypto.randomUUID(), content: json } }],
    zones: {},
  }
}

export function htmlToPostBody(html: string): { bodyHtml: string; bodySource: unknown } {
  const json = generateJSON(html, proseExtensions)
  return { bodyHtml: renderProseHtml(json), bodySource: json }
}
