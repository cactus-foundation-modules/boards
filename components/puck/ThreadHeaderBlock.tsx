// [ANCHOR] - threadSlug is injected by the thread page (lib/inject-entry-context.ts)
export type ThreadHeaderProps = { threadSlug?: string }

export function ThreadHeader() {
  return (
    <div style={{ opacity: 0.6 }}>
      <div style={{ height: 32, width: '60%', background: 'var(--color-border)', borderRadius: 4, marginBottom: '0.5rem' }} />
      <div style={{ height: 16, width: '40%', background: 'var(--color-border)', borderRadius: 4 }} />
    </div>
  )
}

export const threadHeaderPuckComponent = {
  label: 'Boards: Thread Header [Anchor]',
  fields: {},
  defaultProps: {},
  permissions: { delete: false, duplicate: false },
  render: ThreadHeader,
}
