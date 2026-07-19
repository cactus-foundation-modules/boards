// boardSlug/kind are injected by the category page (lib/inject-category-context.ts).
// Renders nothing on a sub-board page - sub-boards are one level deep only.
//
// Editor half only. The database-backed render lives in ./SubBoardListBlock.rsc,
// the same split every other block in this module already uses: this file is
// pulled into the Puck editor's client bundle through the generated
// module-components registry, so whatever it imports ends up in the browser. It
// must never reach prisma - lib/db/prisma attaches a client extension at module
// scope, which throws on load in a browser and takes the whole page builder down
// with it, not just this block.
export type SubBoardListProps = { boardSlug?: string; kind?: 'board' | 'sub-board' }

export function SubBoardList() {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', opacity: 0.6 }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ height: 28, width: 90, background: 'var(--color-border)', borderRadius: 999 }} />)}
    </div>
  )
}

export const subBoardListPuckComponent = {
  label: 'Boards: Sub-Board List',
  fields: {},
  defaultProps: {},
  render: SubBoardList,
}
