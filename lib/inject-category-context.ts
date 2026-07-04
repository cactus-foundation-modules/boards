export type PuckData = { root: { props?: Record<string, any> }; content: any[]; zones?: Record<string, any> }

const CATEGORY_CONTEXT_BLOCKS = new Set(['BoardHeader', 'SubBoardList', 'ThreadList'])

export type BoardsCategoryContext = {
  boardSlug: string
  subBoardSlug?: string
  kind: 'board' | 'sub-board'
  page: number
}

// The 'boardsCategory' layout's blocks have no per-instance board/sub-board of
// their own (it's one shared template rendered for every board and sub-board)
// - the listing page injects its own context into these block types' props
// right before rendering, mirroring Shop's injectProductContext
// (modules/shop/lib/inject-product-context.ts).
function injectBlocks(blocks: unknown[], ctx: BoardsCategoryContext): void {
  for (const item of blocks) {
    if (!item || typeof item !== 'object') continue
    const block = item as { type?: string; props?: Record<string, unknown> }
    if (block.type && CATEGORY_CONTEXT_BLOCKS.has(block.type) && block.props) {
      Object.assign(block.props, ctx)
    }
    if (block.props) {
      for (const value of Object.values(block.props)) {
        if (Array.isArray(value)) injectBlocks(value, ctx)
      }
    }
  }
}

export function injectCategoryContext(data: PuckData, ctx: BoardsCategoryContext): PuckData {
  const cloned = JSON.parse(JSON.stringify(data)) as PuckData
  const content = Array.isArray(cloned.content) ? cloned.content : []
  const zoneBlocks = Object.values(cloned.zones ?? {}).flatMap((z) => (Array.isArray(z) ? z : []))
  injectBlocks([...content, ...zoneBlocks], ctx)
  return cloned
}
