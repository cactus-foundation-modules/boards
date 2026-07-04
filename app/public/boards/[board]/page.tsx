import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Render } from '@puckeditor/core/rsc'
import { getSessionFromCookie } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { isBoardVisible } from '@/modules/boards/lib/visibility'
import { getBoardBySlug } from '@/modules/boards/lib/db'
import { getBoardsSettings } from '@/modules/boards/lib/settings'
import ThreadListItem, { type ThreadRow } from '@/modules/boards/components/public/ThreadListItem'
import NewThreadSection from '@/modules/boards/components/public/NewThreadSection'
import { resolveThemeLayout } from '@/lib/layout/resolveThemeLayout'
import { getModuleLayoutPuckRscConfig } from '@/lib/puck/config'
import { injectCategoryContext, type PuckData } from '@/modules/boards/lib/inject-category-context'

type Props = { params: Promise<{ board: string }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { board: slug } = await params
  const board = await getBoardBySlug(slug)
  if (!board) return {}
  return {
    title: board.title as string,
    ...(board.noindex ? { robots: { index: false } } : {}),
  }
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { board: slug } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const board = await getBoardBySlug(slug)
  if (!board) notFound()

  const user = await getSessionFromCookie()
  const access = user ? await getBoardsAccess(user) : null
  if (!(await isBoardVisible(board.id as string, !!user, access))) notFound()

  const layout = await resolveThemeLayout('boardsCategory', { moduleName: 'boards', slug })
  if (layout?.builderData) {
    const data = injectCategoryContext(layout.builderData as PuckData, { boardSlug: slug, kind: 'board', page })
    return <Render config={getModuleLayoutPuckRscConfig('boardsCategory') as any} data={data as any} />
  }

  const settings = await getBoardsSettings()
  const perPage = settings.threadsPerPage

  const subBoards = await prisma.$queryRaw<Array<{ id: string; title: string; slug: string }>>`
    SELECT "id", "title", "slug" FROM "brd_sub_boards" WHERE "board_id" = ${board.id} ORDER BY "position" ASC
  `

  const threads = await prisma.$queryRaw<ThreadRow[]>`
    SELECT t.*, u."last_read_post_at"
    FROM "brd_threads" t
    LEFT JOIN "brd_read_state" u ON u."thread_id" = t."id" AND u."user_id" = ${user?.id ?? null}
    WHERE t."board_id" = ${board.id} AND t."sub_board_id" IS NULL AND t."status" IN ('PUBLISHED', 'ARCHIVED')
    ORDER BY t."is_global_announcement" DESC, t."is_pinned" DESC, t."last_post_at" DESC NULLS LAST
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `
  const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) FROM "brd_threads" WHERE "board_id" = ${board.id} AND "sub_board_id" IS NULL AND "status" IN ('PUBLISHED', 'ARCHIVED')
  `
  const totalPages = Math.max(1, Math.ceil(Number(count) / perPage))

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="page-header">
        <h1>{board.icon_emoji ? `${board.icon_emoji} ` : ''}{board.title as string}</h1>
        {user && !board.is_locked && <NewThreadSection boardId={board.id as string} boardSlug={slug} />}
      </div>
      {board.description ? <p style={{ color: 'var(--color-text-muted)' }}>{board.description as string}</p> : null}

      {subBoards.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          {subBoards.map((sb) => (
            <Link key={sb.id} href={`/boards/${slug}/${sb.slug}`} className="btn btn-ghost btn-sm">{sb.title}</Link>
          ))}
        </div>
      )}

      {threads.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No threads yet.</p>}
      {threads.map((t) => <ThreadListItem key={t.id} thread={t} showUnread={!!user} />)}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          {page > 1 && <Link href={`/boards/${slug}?page=${page - 1}`} className="btn btn-ghost btn-sm">Previous</Link>}
          <span style={{ fontSize: 'var(--text-sm)', alignSelf: 'center' }}>Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`/boards/${slug}?page=${page + 1}`} className="btn btn-ghost btn-sm">Next</Link>}
        </div>
      )}
    </div>
  )
}
