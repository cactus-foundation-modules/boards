import { connection } from 'next/server'
import Link from 'next/link'
import { getSessionFromCookie } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { getBoardBySlug, getSubBoardBySlug } from '@/modules/boards/lib/db'
import { getBoardsSettings } from '@/modules/boards/lib/settings'
import ThreadListItem, { type ThreadRow } from '@/modules/boards/components/public/ThreadListItem'

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

export async function ThreadListRsc(props: ThreadListProps) {
  await connection()
  if (!props.boardSlug) return null
  const board = await getBoardBySlug(props.boardSlug)
  if (!board) return null

  const isSubBoard = props.kind === 'sub-board' && !!props.subBoardSlug
  const subBoard = isSubBoard ? await getSubBoardBySlug(board.id as string, props.subBoardSlug!) : null
  if (isSubBoard && !subBoard) return null

  const user = await getSessionFromCookie()
  const settings = await getBoardsSettings()
  const perPage = settings.threadsPerPage
  const page = props.page ?? 1

  const threads = subBoard
    ? await prisma.$queryRaw<ThreadRow[]>`
        SELECT t.*, u."last_read_post_at"
        FROM "brd_threads" t
        LEFT JOIN "brd_read_state" u ON u."thread_id" = t."id" AND u."user_id" = ${user?.id ?? null}
        WHERE t."sub_board_id" = ${subBoard.id} AND t."status" IN ('PUBLISHED', 'ARCHIVED')
        ORDER BY t."is_global_announcement" DESC, t."is_pinned" DESC, t."last_post_at" DESC NULLS LAST
        LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
      `
    : await prisma.$queryRaw<ThreadRow[]>`
        SELECT t.*, u."last_read_post_at"
        FROM "brd_threads" t
        LEFT JOIN "brd_read_state" u ON u."thread_id" = t."id" AND u."user_id" = ${user?.id ?? null}
        WHERE t."board_id" = ${board.id} AND t."sub_board_id" IS NULL AND t."status" IN ('PUBLISHED', 'ARCHIVED')
        ORDER BY t."is_global_announcement" DESC, t."is_pinned" DESC, t."last_post_at" DESC NULLS LAST
        LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
      `

  const [{ count }] = subBoard
    ? await prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM "brd_threads" WHERE "sub_board_id" = ${subBoard.id} AND "status" IN ('PUBLISHED', 'ARCHIVED')`
    : await prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM "brd_threads" WHERE "board_id" = ${board.id} AND "sub_board_id" IS NULL AND "status" IN ('PUBLISHED', 'ARCHIVED')`
  const totalPages = Math.max(1, Math.ceil(Number(count) / perPage))
  const baseUrl = subBoard ? `/boards/${props.boardSlug}/${props.subBoardSlug}` : `/boards/${props.boardSlug}`

  return (
    <div>
      {threads.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No threads yet.</p>}
      {threads.map((t) => <ThreadListItem key={t.id} thread={t} showUnread={!!user} />)}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          {page > 1 && <Link href={`${baseUrl}?page=${page - 1}`} className="btn btn-ghost btn-sm">Previous</Link>}
          <span style={{ fontSize: 'var(--text-sm)', alignSelf: 'center' }}>Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`${baseUrl}?page=${page + 1}`} className="btn btn-ghost btn-sm">Next</Link>}
        </div>
      )}
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

export const threadListPuckRscComponent = { ...threadListPuckComponent, render: ThreadListRsc }
