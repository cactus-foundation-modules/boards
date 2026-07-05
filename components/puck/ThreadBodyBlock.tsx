// [ANCHOR] - threadSlug is injected by the thread page (lib/inject-entry-context.ts).
// Nests a <ThreadBody> of the thread's own opener content, plus the
// post-content actions (share, subscribe/bookmark) that don't need their own
// independently repositionable region.
export type ThreadBodyProps = { threadSlug?: string }

export function ThreadBodyBlock() {
  return (
    <div style={{ opacity: 0.6, display: 'grid', gap: '0.75rem' }}>
      {[0, 1, 2, 3].map((i) => <div key={i} style={{ height: 16, width: `${90 - i * 10}%`, background: 'var(--color-border)', borderRadius: 4 }} />)}
    </div>
  )
}

export const threadBodyPuckComponent = {
  label: 'Boards: Thread Body [Anchor]',
  fields: {},
  defaultProps: {},
  permissions: { delete: false, duplicate: false },
  render: ThreadBodyBlock,
}
