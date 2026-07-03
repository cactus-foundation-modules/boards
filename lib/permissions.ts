import { hasPermission, isAdmin } from '@/lib/permissions/check'
import type { SessionUser } from '@/lib/auth/session'
import type { BoardsAccess } from './types'

export async function getBoardsAccess(user: SessionUser): Promise<BoardsAccess> {
  const isAdminUser = isAdmin(user)
  const canModerate = isAdminUser || (await hasPermission(user, 'boards.moderate'))
  return { isAdminUser, canModerate }
}

// Moderators and admins are exempt from the author edit window.
export function withinEditWindow(createdAt: Date, editWindowMinutes: number): boolean {
  if (editWindowMinutes <= 0) return true
  return Date.now() - createdAt.getTime() <= editWindowMinutes * 60_000
}
