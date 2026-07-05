// [ANCHOR] - boardSlug/subBoardSlug/kind/page are injected by the category
// page (lib/inject-category-context.ts)
export type ThreadListProps = { boardSlug?: string; subBoardSlug?: string; kind?: 'board' | 'sub-board'; page?: number }

export function ThreadList() {
  return (
    <div style={{ display: 'grid', gap: '0.75rem', opacity: 0.6 }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ height: 64, background: 'var(--color-border)', borderRadius: 8 }} />)}
    </div>
  )
}

export const threadListPuckComponent = {
  label: 'Boards: Thread List [Anchor]',
  fields: {},
  defaultProps: {},
  permissions: { delete: false, duplicate: false },
  render: ThreadList,
}
