import { connection } from 'next/server'
import Link from 'next/link'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { isBoardVisible } from '@/modules/boards/lib/visibility'
import { getBoardBySlug, getSubBoardBySlug } from '@/modules/boards/lib/db'
import NewThreadSection from '@/modules/boards/components/public/NewThreadSection'

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

export async function BoardHeaderRsc(props: BoardHeaderProps) {
  await connection()
  if (!props.boardSlug) return null
  const board = await getBoardBySlug(props.boardSlug)
  if (!board) return null

  const user = await getSessionFromCookie()
  const access = user ? await getBoardsAccess(user) : null
  if (!(await isBoardVisible(board.id as string, !!user, access))) return null

  const isSubBoard = props.kind === 'sub-board' && !!props.subBoardSlug
  const subBoard = isSubBoard ? await getSubBoardBySlug(board.id as string, props.subBoardSlug!) : null
  if (isSubBoard && !subBoard) return null

  const locked = subBoard ? (subBoard.is_locked as boolean) || (board.is_locked as boolean) : (board.is_locked as boolean)

  return (
    <div>
      {subBoard && (
        <div style={{ fontSize: 'var(--text-sm)', marginBottom: '0.5rem' }}>
          <Link href={`/boards/${props.boardSlug}`} style={{ color: 'var(--color-text-muted)' }}>{board.title as string}</Link> / {subBoard.title as string}
        </div>
      )}
      <div className="page-header">
        <h1>{subBoard ? (subBoard.title as string) : `${board.icon_emoji ? `${board.icon_emoji} ` : ''}${board.title as string}`}</h1>
        {user && !locked && (
          <NewThreadSection boardId={board.id as string} boardSlug={props.boardSlug} subBoardId={subBoard?.id as string | undefined} />
        )}
      </div>
      {(subBoard ? subBoard.description : board.description) ? (
        <p style={{ color: 'var(--color-text-muted)' }}>{(subBoard ? subBoard.description : board.description) as string}</p>
      ) : null}
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

export const boardHeaderPuckRscComponent = { ...boardHeaderPuckComponent, render: BoardHeaderRsc }
