import { prisma } from '@/lib/db/prisma'
import { isAdmin } from '@/lib/permissions/check'
import type { SessionUser } from '@/lib/auth/session'
import type { BoardsAccess } from './types'

export async function getBoardsAccess(user: SessionUser): Promise<BoardsAccess> {
  const isAdminUser = isAdmin(user)

  const rows = await prisma.$queryRaw<Array<{ board_id: string | null }>>`
    SELECT "board_id" FROM "brd_moderator_assignments" WHERE "user_id" = ${user.id}
  `
  const isGlobalModerator = rows.some((r) => r.board_id === null)
  const moderatedBoardIds = new Set(rows.filter((r) => r.board_id !== null).map((r) => r.board_id as string))

  return { isAdminUser, isGlobalModerator, moderatedBoardIds }
}

// True when the user can moderate the given board (hide/delete/lock/pin/etc).
export function canModerateBoard(access: BoardsAccess, boardId: string): boolean {
  return access.isAdminUser || access.isGlobalModerator || access.moderatedBoardIds.has(boardId)
}

// True when the user holds moderator capability somewhere (any board, or globally).
export function isAnyModerator(access: BoardsAccess): boolean {
  return access.isAdminUser || access.isGlobalModerator || access.moderatedBoardIds.size > 0
}

// Global-Moderator-tier actions: bans, IP bans, global announcements.
export function isGlobalModeratorOrAdmin(access: BoardsAccess): boolean {
  return access.isAdminUser || access.isGlobalModerator
}

// Moderators and admins are exempt from the author edit window.
export function withinEditWindow(createdAt: Date, editWindowMinutes: number): boolean {
  if (editWindowMinutes <= 0) return true
  return Date.now() - createdAt.getTime() <= editWindowMinutes * 60_000
}
