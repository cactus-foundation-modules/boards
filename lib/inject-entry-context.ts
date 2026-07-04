import type { PuckData } from '@/modules/boards/lib/inject-category-context'

const ENTRY_CONTEXT_BLOCKS = new Set(['ThreadHeader', 'ThreadBody', 'ReplyList'])

export type BoardsEntryContext = { threadSlug: string; boardSlug: string; page: number; sort?: string }

// The 'boardsEntry' layout's blocks have no per-instance thread of their own
// (it's one shared template rendered for every thread) - the thread page
// injects the current thread's context into each of these block types' props
// right before rendering, mirroring Shop's injectProductContext
// (modules/shop/lib/inject-product-context.ts).
function injectBlocks(blocks: unknown[], ctx: BoardsEntryContext): void {
  for (const item of blocks) {
    if (!item || typeof item !== 'object') continue
    const block = item as { type?: string; props?: Record<string, unknown> }
    if (block.type && ENTRY_CONTEXT_BLOCKS.has(block.type) && block.props) {
      Object.assign(block.props, ctx)
    }
    if (block.props) {
      for (const value of Object.values(block.props)) {
        if (Array.isArray(value)) injectBlocks(value, ctx)
      }
    }
  }
}

export function injectEntryContext(data: PuckData, ctx: BoardsEntryContext): PuckData {
  const cloned = JSON.parse(JSON.stringify(data)) as PuckData
  const content = Array.isArray(cloned.content) ? cloned.content : []
  const zoneBlocks = Object.values(cloned.zones ?? {}).flatMap((z) => (Array.isArray(z) ? z : []))
  injectBlocks([...content, ...zoneBlocks], ctx)
  return cloned
}
