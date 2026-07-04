import type { Metadata } from 'next'
import Link from 'next/link'
import { getSessionFromCookie } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { getVisibleBoardIds } from '@/modules/boards/lib/visibility'
import { getBoardsSettings } from '@/modules/boards/lib/settings'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getBoardsSettings()
  return { title: settings.feedTitle ?? 'Boards' }
}

type Props = { searchParams: Promise<{ q?: string }> }

export default async function BoardsIndexPage({ searchParams }: Props) {
  const { q } = await searchParams
  const user = await getSessionFromCookie()
  const access = user ? await getBoardsAccess(user) : null
  const visibleBoardIds = await getVisibleBoardIds(!!user, access)
  const settings = await getBoardsSettings()

  if (q) {
    const threads = visibleBoardIds.length > 0
      ? await prisma.$queryRaw<Array<{ id: string; title: string; slug: string; board_title: string }>>`
          SELECT t."id", t."title", t."slug", b."title" AS board_title
          FROM "brd_threads" t JOIN "brd_boards" b ON b."id" = t."board_id"
          WHERE t."status" = 'PUBLISHED' AND t."board_id" = ANY(${visibleBoardIds})
            AND to_tsvector('english', t."title") @@ plainto_tsquery('english', ${q})
          ORDER BY t."created_at" DESC LIMIT 50
        `
      : []
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1>Search results for &quot;{q}&quot;</h1>
        <form action="/boards" method="get" style={{ margin: '1rem 0' }}>
          <input name="q" defaultValue={q} style={{ width: '100%', maxWidth: 400, padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)' }} />
        </form>
        {threads.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No threads matched your search.</p>}
        {threads.map((t) => (
          <div key={t.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)' }}>
            <Link href={`/boards/t/${t.slug}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'var(--color-text)' }}>{t.title}</Link>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{t.board_title}</div>
          </div>
        ))}
      </div>
    )
  }

  const [categories, boards, subBoards, announcements] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; title: string }>>`SELECT "id", "title" FROM "brd_categories" ORDER BY "position" ASC`,
    prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT b.*, (SELECT COUNT(*) FROM "brd_threads" t WHERE t."board_id" = b."id") AS thread_count
      FROM "brd_boards" b WHERE b."id" = ANY(${visibleBoardIds}) ORDER BY b."category_id" NULLS LAST, b."position" ASC
    `,
    prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "brd_sub_boards" WHERE "board_id" = ANY(${visibleBoardIds}) ORDER BY "position" ASC`,
    visibleBoardIds.length > 0
      ? prisma.$queryRaw<Array<{ title: string; slug: string }>>`
          SELECT "title", "slug" FROM "brd_threads" WHERE "is_global_announcement" = true AND "status" = 'PUBLISHED' AND "board_id" = ANY(${visibleBoardIds})
          ORDER BY "created_at" DESC
        `
      : Promise.resolve([]),
  ])

  const boardsByCategory = new Map<string, typeof boards>()
  const uncategorised: typeof boards = []
  for (const b of boards) {
    const catId = b.category_id as string | null
    if (!catId) { uncategorised.push(b); continue }
    if (!boardsByCategory.has(catId)) boardsByCategory.set(catId, [])
    boardsByCategory.get(catId)!.push(b)
  }
  const subBoardsByBoard = new Map<string, typeof subBoards>()
  for (const sb of subBoards) {
    const boardId = sb.board_id as string
    if (!subBoardsByBoard.has(boardId)) subBoardsByBoard.set(boardId, [])
    subBoardsByBoard.get(boardId)!.push(sb)
  }

  function renderBoard(b: Record<string, unknown>) {
    const id = b.id as string
    return (
      <div key={id} style={{ padding: '0.875rem 0', borderBottom: '1px solid var(--color-border)' }}>
        <Link href={`/boards/${b.slug}`} style={{ fontWeight: 600, fontSize: '1.0625rem', textDecoration: 'none', color: 'var(--color-text)' }}>
          {b.icon_emoji ? `${b.icon_emoji} ` : ''}{b.title as string}
        </Link>
        {b.description ? <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{b.description as string}</p> : null}
        {(subBoardsByBoard.get(id) ?? []).length > 0 && (
          <div style={{ marginTop: '0.375rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {(subBoardsByBoard.get(id) ?? []).map((sb) => (
              <Link key={sb.id as string} href={`/boards/${b.slug}/${sb.slug}`} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', textDecoration: 'none' }}>
                {sb.title as string}
              </Link>
            ))}
          </div>
        )}
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{Number(b.thread_count)} threads</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>{settings.feedTitle ?? 'Boards'}</h1>
      {settings.feedDescription && <p style={{ color: 'var(--color-text-muted)' }}>{settings.feedDescription}</p>}

      <form action="/boards" method="get" style={{ margin: '1rem 0' }}>
        <input name="q" placeholder="Search the forum…" style={{ width: '100%', maxWidth: 400, padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)' }} />
      </form>

      {announcements.length > 0 && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'var(--color-bg-subtle)' }}>
          <strong style={{ fontSize: 'var(--text-sm)' }}>📢 Announcements</strong>
          {announcements.map((a) => (
            <div key={a.slug}><Link href={`/boards/t/${a.slug}`}>{a.title}</Link></div>
          ))}
        </div>
      )}

      {categories.map((c) => {
        const catBoards = boardsByCategory.get(c.id) ?? []
        if (catBoards.length === 0) return null
        return (
          <div key={c.id} id={`cat-${c.id}`} style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{c.title}</h2>
            {catBoards.map(renderBoard)}
          </div>
        )
      })}

      {uncategorised.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {categories.length > 0 && <h2 style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>Other boards</h2>}
          {uncategorised.map(renderBoard)}
        </div>
      )}
    </div>
  )
}
