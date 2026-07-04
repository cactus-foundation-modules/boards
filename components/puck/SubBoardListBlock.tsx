import { connection } from 'next/server'
import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { getBoardBySlug } from '@/modules/boards/lib/db'

// boardSlug/kind are injected by the category page (lib/inject-category-context.ts).
// Renders nothing on a sub-board page - sub-boards are one level deep only.
export type SubBoardListProps = { boardSlug?: string; kind?: 'board' | 'sub-board' }

export function SubBoardList() {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', opacity: 0.6 }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ height: 28, width: 90, background: 'var(--color-border)', borderRadius: 999 }} />)}
    </div>
  )
}

export async function SubBoardListRsc(props: SubBoardListProps) {
  await connection()
  if (props.kind === 'sub-board' || !props.boardSlug) return null
  const board = await getBoardBySlug(props.boardSlug)
  if (!board) return null

  const subBoards = await prisma.$queryRaw<Array<{ id: string; title: string; slug: string }>>`
    SELECT "id", "title", "slug" FROM "brd_sub_boards" WHERE "board_id" = ${board.id} ORDER BY "position" ASC
  `
  if (subBoards.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1rem 0' }}>
      {subBoards.map((sb) => (
        <Link key={sb.id} href={`/boards/${props.boardSlug}/${sb.slug}`} className="btn btn-ghost btn-sm">{sb.title}</Link>
      ))}
    </div>
  )
}

export const subBoardListPuckComponent = {
  label: 'Boards: Sub-Board List',
  fields: {},
  defaultProps: {},
  render: SubBoardList,
}

export const subBoardListPuckRscComponent = { ...subBoardListPuckComponent, render: SubBoardListRsc }
