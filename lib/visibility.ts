import { prisma } from '@/lib/db/prisma'
import { canModerateBoard } from './permissions'
import type { BoardsAccess } from './types'

// Board IDs visible to the given requester. PUBLIC boards are always visible;
// MEMBERS boards require a session; PRIVATE boards require moderator capability
// on that specific board (or Global Moderator/admin). Sub-boards inherit their
// parent board's visibility, so callers join on board_id and reuse this set.
export async function getVisibleBoardIds(hasSession: boolean, access: BoardsAccess | null): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string; visibility: string }>>`
    SELECT "id", "visibility" FROM "brd_boards"
  `
  return rows
    .filter((r) => {
      if (r.visibility === 'PUBLIC') return true
      if (r.visibility === 'MEMBERS') return hasSession
      if (r.visibility === 'PRIVATE') return !!access && canModerateBoard(access, r.id)
      return false
    })
    .map((r) => r.id)
}

export async function isBoardVisible(boardId: string, hasSession: boolean, access: BoardsAccess | null): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ visibility: string }>>`
    SELECT "visibility" FROM "brd_boards" WHERE "id" = ${boardId} LIMIT 1
  `
  const board = rows[0]
  if (!board) return false
  if (board.visibility === 'PUBLIC') return true
  if (board.visibility === 'MEMBERS') return hasSession
  if (board.visibility === 'PRIVATE') return !!access && canModerateBoard(access, boardId)
  return false
}
