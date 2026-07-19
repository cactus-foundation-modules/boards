import { connection } from 'next/server'
import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { getBoardBySlug } from '@/modules/boards/lib/db'
import { subBoardListPuckComponent, type SubBoardListProps } from './SubBoardListBlock'

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

export const subBoardListPuckRscComponent = { ...subBoardListPuckComponent, render: SubBoardListRsc }
