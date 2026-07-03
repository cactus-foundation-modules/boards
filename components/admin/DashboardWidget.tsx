import { prisma } from '@/lib/db/prisma'
import { headers } from 'next/headers'

// Contributed to the core `core.admin-dashboard-widgets` extension point
// (BOARDS_SPEC 5.10). Server component, self-contained data fetch.
export async function boardsDashboardWidget() {
  const [{ threads, posts, open_queue }] = await prisma.$queryRaw<[{ threads: bigint; posts: bigint; open_queue: bigint }]>`
    SELECT
      (SELECT COUNT(*) FROM "brd_threads") AS threads,
      (SELECT COUNT(*) FROM "brd_posts") AS posts,
      (SELECT COUNT(*) FROM "brd_moderation_queue" WHERE "status" = 'OPEN') AS open_queue
  `
  const adminPath = (await headers()).get('x-cactus-admin-path') ?? ''

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h2 className="card-title" style={{ margin: '0 0 0.75rem' }}>Boards</h2>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
        <div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{Number(threads)}</div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Threads</div></div>
        <div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{Number(posts)}</div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Posts</div></div>
        <div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{Number(open_queue)}</div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Awaiting review</div></div>
      </div>
      <a href={`/${adminPath}/m/boards/threads`} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', textDecoration: 'none' }}>Manage Boards →</a>
    </div>
  )
}
