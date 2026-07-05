// [ANCHOR] - threadSlug/page/sort are injected by the thread page
// (lib/inject-entry-context.ts). Replies are core content, not decoration.
export type ReplyListProps = { threadSlug?: string; page?: number; sort?: string }

export function ReplyList() {
  return (
    <div style={{ display: 'grid', gap: '0.75rem', opacity: 0.6 }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ height: 80, background: 'var(--color-border)', borderRadius: 8 }} />)}
    </div>
  )
}

export const replyListPuckComponent = {
  label: 'Boards: Reply List [Anchor]',
  fields: {},
  defaultProps: {},
  permissions: { delete: false, duplicate: false },
  render: ReplyList,
}
