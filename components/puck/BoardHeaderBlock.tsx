// [ANCHOR] - boardSlug/subBoardSlug/kind are injected by the category page
// (lib/inject-category-context.ts)
export type BoardHeaderProps = { boardSlug?: string; subBoardSlug?: string; kind?: 'board' | 'sub-board' }

export function BoardHeader() {
  return (
    <div style={{ opacity: 0.6 }}>
      <div style={{ height: 32, width: '40%', background: 'var(--color-border)', borderRadius: 4, marginBottom: '0.5rem' }} />
      <div style={{ height: 18, width: '60%', background: 'var(--color-border)', borderRadius: 4 }} />
    </div>
  )
}

export const boardHeaderPuckComponent = {
  label: 'Boards: Board Header [Anchor]',
  fields: {},
  defaultProps: {},
  permissions: { delete: false, duplicate: false },
  render: BoardHeader,
}
